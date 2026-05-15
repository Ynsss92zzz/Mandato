import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

const PRICE_TO_PLAN: Record<string, string> = {}

function getPriceMap() {
  if (Object.keys(PRICE_TO_PLAN).length === 0) {
    const ids = {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      pro:     process.env.STRIPE_PRO_PRICE_ID,
      agence:  process.env.STRIPE_AGENCE_PRICE_ID,
    }
    for (const [plan, priceId] of Object.entries(ids)) {
      if (priceId) PRICE_TO_PLAN[priceId] = plan
    }
  }
  return PRICE_TO_PLAN
}

/**
 * POST /api/stripe/sync-subscription
 * Header: Authorization: Bearer <CRON_SECRET>
 * Body: { agency_id: string }  — or omit to sync ALL agencies with a stripe_subscription_id
 *
 * Fetches the live subscription from Stripe and writes plan + status to DB.
 * Use this to fix existing subscriptions that missed webhook updates.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const priceMap = getPriceMap()

  const body = await request.json().catch(() => ({}))
  const agencyIdFilter = body?.agency_id as string | undefined

  // Fetch subscriptions to sync
  const query = supabase
    .from('subscriptions')
    .select('agency_id, stripe_subscription_id')
    .not('stripe_subscription_id', 'is', null)

  if (agencyIdFilter) query.eq('agency_id', agencyIdFilter)

  const { data: rows, error: fetchError } = await query
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const results: { agency_id: string; plan: string | null; status: string; error?: string }[] = []

  for (const row of rows ?? []) {
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id!)
      const item = sub.items.data[0]
      const priceId = item?.price?.id ?? null
      const plan = (sub.metadata?.plan_id ?? (priceId ? priceMap[priceId] : null)) ?? null

      const { error } = await supabase
        .from('subscriptions')
        .update({
          stripe_price_id: priceId,
          status: sub.status as 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete',
          current_period_start: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : null,
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
          ...(plan ? { plan: plan as 'starter' | 'pro' | 'agence' } : {}),
        })
        .eq('agency_id', row.agency_id)

      results.push({ agency_id: row.agency_id, plan, status: sub.status, ...(error ? { error: error.message } : {}) })
    } catch (err) {
      results.push({ agency_id: row.agency_id, plan: null, status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ synced: results.length, results })
}
