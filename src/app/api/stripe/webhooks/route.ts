import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

function buildPriceMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const entries: [string, string | undefined][] = [
    ['starter', process.env.STRIPE_STARTER_PRICE_ID],
    ['pro',     process.env.STRIPE_PRO_PRICE_ID],
    ['agence',  process.env.STRIPE_AGENCE_PRICE_ID],
  ]
  for (const [plan, priceId] of entries) {
    if (priceId) map[priceId] = plan
  }
  console.log('[webhook] priceMap:', JSON.stringify(map))
  return map
}

/**
 * Primary: look up agency by stripe_customer_id in our DB — works for all events.
 * Fallback: sub/session metadata (set at checkout for new checkouts only).
 */
async function resolveAgencyId(params: {
  customerId?: string | null
  metadataAgencyId?: string | null
}): Promise<string | null> {
  const supabase = createAdminClient()
  const { customerId, metadataAgencyId } = params

  // Best source: DB lookup by Stripe customer ID
  if (customerId) {
    const { data: agency, error } = await supabase
      .from('agencies')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (agency?.id) {
      console.log('[webhook] resolveAgencyId: found via stripe_customer_id', { customerId, agencyId: agency.id })
      return agency.id
    }
    console.warn('[webhook] resolveAgencyId: no agency with stripe_customer_id', customerId, error?.message)
  }

  // Fallback: metadata (new checkouts only, not present on older subscriptions)
  if (metadataAgencyId) {
    console.log('[webhook] resolveAgencyId: using metadata agency_id', metadataAgencyId)
    return metadataAgencyId
  }

  console.error('[webhook] resolveAgencyId: could not resolve agency_id', { customerId, metadataAgencyId })
  return null
}

async function syncSubscription(
  sub: Stripe.Subscription,
  priceMap: Record<string, string>,
  sessionMetadata?: Stripe.Metadata | null,
) {
  const supabase = createAdminClient()

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  const agencyId = await resolveAgencyId({
    customerId,
    metadataAgencyId: sub.metadata?.agency_id ?? sessionMetadata?.agency_id,
  })

  if (!agencyId) return

  const item = sub.items.data[0]
  const priceId = item?.price?.id ?? null

  // Priority: sub metadata plan_id → session metadata plan_id → price ID reverse lookup
  const planRaw =
    sub.metadata?.plan_id ??
    sessionMetadata?.plan_id ??
    (priceId ? priceMap[priceId] : null) ??
    null
  const plan = planRaw as 'starter' | 'pro' | 'agence' | null

  const payload = {
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: sub.status as 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete',
    current_period_start: item?.current_period_start
      ? new Date(item.current_period_start * 1000).toISOString()
      : null,
    current_period_end: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
    ...(plan ? { plan } : {}),
  }

  console.log('[webhook] syncSubscription payload', {
    agencyId,
    subId: sub.id,
    status: sub.status,
    priceId,
    plan,
    subMetadata: sub.metadata,
  })

  const { error, data } = await supabase
    .from('subscriptions')
    .update(payload)
    .eq('agency_id', agencyId)
    .select('id, plan, status, stripe_subscription_id')

  if (error) {
    console.error('[webhook] DB update FAILED', { agencyId, error: error.message, code: error.code })
  } else if (!data || data.length === 0) {
    console.error('[webhook] DB update: 0 rows matched for agency_id', agencyId, '— subscription row may not exist')
  } else {
    console.log('[webhook] DB update OK', data)
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] signature invalide:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  console.log('[webhook] received:', event.type, event.id)

  // Wrap in try-catch so exceptions don't return 500 to Stripe (which triggers retries)
  try {
    const priceMap = buildPriceMap()

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await syncSubscription(sub, priceMap)
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('[webhook] checkout.session.completed metadata:', JSON.stringify(session.metadata))

        if (!session.subscription) {
          console.error('[webhook] checkout.session.completed: no subscription on session', session.id)
          break
        }

        const subId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id

        const sub = await stripe.subscriptions.retrieve(subId)
        await syncSubscription(sub, priceMap, session.metadata)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        const agencyId = await resolveAgencyId({
          customerId,
          metadataAgencyId: sub.metadata?.agency_id,
        })
        if (agencyId) {
          const supabase = createAdminClient()
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled', plan: 'starter' })
            .eq('agency_id', agencyId)
          console.log('[webhook] subscription deleted → plan reset to starter', { agencyId })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.warn('[webhook] invoice.payment_failed', {
          customer: invoice.customer,
          amount: invoice.amount_due,
        })
        break
      }

      default:
        console.log('[webhook] ignored:', event.type)
    }
  } catch (err) {
    // Log but still return 200 — Stripe retries on 5xx which causes duplicate processing
    console.error('[webhook] unhandled error processing', event.type, event.id, err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ received: true })
}
