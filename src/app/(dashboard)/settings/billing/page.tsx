import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Abonnement' }

export default function BillingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-6">Abonnement &amp; facturation</h1>
    </div>
  )
}
