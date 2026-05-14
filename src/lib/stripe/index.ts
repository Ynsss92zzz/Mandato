import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export async function createStripeCustomer(email: string, agencyId: string) {
  return stripe.customers.create({
    email,
    metadata: { agency_id: agencyId },
  })
}

export async function createCheckoutSession({
  customerId,
  priceId,
  planId,
  agencyId,
  successUrl,
  cancelUrl,
}: {
  customerId: string
  priceId: string
  planId: string
  agencyId: string
  successUrl: string
  cancelUrl: string
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { agency_id: agencyId, plan_id: planId },
    subscription_data: {
      trial_period_days: 14,
      metadata: { agency_id: agencyId, plan_id: planId },
    },
  })
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
