import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

// Reverse map: Stripe price ID → internal plan name
function buildPriceMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const ids = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    pro:     process.env.STRIPE_PRO_PRICE_ID,
    agence:  process.env.STRIPE_AGENCE_PRICE_ID,
  }
  for (const [plan, priceId] of Object.entries(ids)) {
    if (priceId) map[priceId] = plan
  }
  return map
}

function planFromPriceId(priceId: string | null | undefined, map: Record<string, string>): string | null {
  if (!priceId) return null
  return map[priceId] ?? null
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
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const priceMap = buildPriceMap()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const agencyId = session.metadata?.agency_id
      const plan = (session.metadata?.plan_id ?? null) as 'starter' | 'pro' | 'agence' | null

      if (!agencyId) {
        console.error('[webhook] checkout.session.completed: agency_id manquant dans metadata', session.id)
        break
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: session.subscription as string,
          status: 'active',
          ...(plan ? { plan } : {}),
        })
        .eq('agency_id', agencyId)

      if (error) {
        console.error('[webhook] checkout.session.completed: update subscriptions failed', agencyId, error)
      } else {
        console.log('[webhook] checkout.session.completed: plan mis à jour', { agencyId, plan, subscriptionId: session.subscription })
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const agencyId = sub.metadata?.agency_id

      if (!agencyId) {
        console.error('[webhook] customer.subscription.updated: agency_id manquant dans metadata', sub.id)
        break
      }

      const item = sub.items.data[0]
      const priceId = item?.price?.id ?? null
      const plan = (sub.metadata?.plan_id ?? planFromPriceId(priceId, priceMap)) as 'starter' | 'pro' | 'agence' | null

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: sub.status as 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete',
          current_period_start: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : null,
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
          ...(plan ? { plan } : {}),
        })
        .eq('agency_id', agencyId)

      if (error) {
        console.error('[webhook] customer.subscription.updated: update failed', agencyId, error)
      } else {
        console.log('[webhook] customer.subscription.updated: plan mis à jour', { agencyId, plan, status: sub.status, priceId })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const agencyId = sub.metadata?.agency_id
      if (!agencyId) break

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', plan: 'starter' })
        .eq('agency_id', agencyId)

      console.log('[webhook] customer.subscription.deleted: plan réinitialisé à starter', { agencyId })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.warn('[webhook] invoice.payment_failed', {
        customer: invoice.customer,
        amount: invoice.amount_due,
      })
      // TODO: notifier l'agence par email via Resend
      break
    }
  }

  return NextResponse.json({ received: true })
}
