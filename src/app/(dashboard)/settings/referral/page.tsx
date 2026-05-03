import type { Metadata } from 'next'
import { getReferralInfo } from '@/actions/referral'
import { ReferralDashboard } from '@/components/settings/referral-dashboard'

export const metadata: Metadata = { title: 'Parrainage — Mandato' }

export default async function ReferralPage() {
  const info = await getReferralInfo()

  if ('error' in info) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy mb-6">Programme de parrainage</h1>
        <p className="text-sm text-red-500">{info.error}</p>
      </div>
    )
  }

  return <ReferralDashboard info={info} />
}
