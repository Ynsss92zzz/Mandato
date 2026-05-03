import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const agencyId = session.metadata?.agency_id
      if (agencyId) {
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: session.subscription as string,
            status: 'active',
          })
          .eq('agency_id', agencyId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const agencyId = sub.metadata?.agency_id
      if (agencyId) {
        // Dans l'API dahlia, les dates de période sont sur les items
        const item = sub.items.data[0]
        await supabase
          .from('subscriptions')
          .update({
            status: sub.status as 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete',
            current_period_start: item?.current_period_start
              ? new Date(item.current_period_start * 1000).toISOString()
              : null,
            current_period_end: item?.current_period_end
              ? new Date(item.current_period_end * 1000).toISOString()
              : null,
          })
          .eq('agency_id', agencyId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const agencyId = sub.metadata?.agency_id
      if (agencyId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('agency_id', agencyId)
      }
      break
    }

    case 'invoice.payment_failed': {
      // TODO: notifier l'agence par email via Resend
      break
    }
  }

  return NextResponse.json({ received: true })
}
