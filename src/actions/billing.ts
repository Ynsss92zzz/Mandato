'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { stripe, createCheckoutSession, createBillingPortalSession, createStripeCustomer } from '@/lib/stripe'

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID ?? '',
  pro:     process.env.STRIPE_PRO_PRICE_ID     ?? '',
  agence:  process.env.STRIPE_AGENCE_PRICE_ID  ?? '',
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'

async function getAgencyAndSub(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', userId)
    .single()
  if (!member) return null

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, stripe_customer_id')
    .eq('id', member.agency_id)
    .single()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan')
    .eq('agency_id', member.agency_id)
    .single()

  return { agency, sub, agencyId: member.agency_id }
}

export async function startCheckout(planId: string): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const priceId = PRICE_IDS[planId]
  if (!priceId) throw new Error(`Price ID manquant pour le plan ${planId}`)

  const data = await getAgencyAndSub(supabase, user.id)
  if (!data?.agency) redirect('/settings/billing')

  let customerId = data.agency.stripe_customer_id

  // Créer le customer Stripe s'il n'existe pas encore
  if (!customerId) {
    const customer = await createStripeCustomer(user.email!, data.agencyId)
    customerId = customer.id
    await supabase
      .from('agencies')
      .update({ stripe_customer_id: customerId })
      .eq('id', data.agencyId)
  }

  const session = await createCheckoutSession({
    customerId,
    priceId,
    agencyId: data.agencyId,
    successUrl: `${APP_URL}/settings/billing?success=1`,
    cancelUrl:  `${APP_URL}/settings/billing?canceled=1`,
  })

  redirect(session.url!)
}

export async function openBillingPortal(): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await getAgencyAndSub(supabase, user.id)
  const customerId = data?.agency?.stripe_customer_id

  if (!customerId) redirect('/settings/billing')

  const session = await createBillingPortalSession(
    customerId,
    `${APP_URL}/settings/billing`,
  )

  redirect(session.url)
}
