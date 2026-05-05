import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvailabilityForm } from '@/components/settings/availability-form'

export const metadata: Metadata = { title: 'Disponibilités' }

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  if (!member) redirect('/dashboard')

  const agencyId = member.agency_id

  const { data: avail } = await supabase
    .from('availability_settings')
    .select('days, start_hour, end_hour, slot_duration, advance_days')
    .eq('agency_id', agencyId)
    .single()

  const initial = {
    days:          avail?.days ?? [1, 2, 3, 4, 5],
    start_hour:    avail?.start_hour ?? 9,
    end_hour:      avail?.end_hour ?? 18,
    slot_duration: avail?.slot_duration ?? 60,
    advance_days:  avail?.advance_days ?? 30,
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mandato-app.vercel.app'
  const bookingUrl = `${appUrl}/booking/${agencyId}`

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Disponibilités</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Configurez vos horaires pour la prise de rendez-vous en ligne.</p>
      </div>

      <AvailabilityForm
        agencyId={agencyId}
        bookingUrl={bookingUrl}
        initial={initial}
      />
    </div>
  )
}
