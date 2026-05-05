import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingCalendar } from '@/components/booking/booking-calendar'

export async function generateMetadata(
  { params }: { params: Promise<{ agencyId: string }> }
): Promise<Metadata> {
  const { agencyId } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.from('agencies').select('name').eq('id', agencyId).single()
  return { title: data ? `Prendre rendez-vous — ${data.name}` : 'Prendre rendez-vous' }
}

export default async function BookingPage(
  { params }: { params: Promise<{ agencyId: string }> }
) {
  const { agencyId } = await params
  const supabase = createAdminClient()

  const [{ data: agency }, { data: avail }] = await Promise.all([
    supabase.from('agencies').select('id, name, logo_url').eq('id', agencyId).single(),
    supabase
      .from('availability_settings')
      .select('days, start_hour, end_hour, slot_duration, advance_days, timezone')
      .eq('agency_id', agencyId)
      .single(),
  ])

  if (!agency) notFound()

  return (
    <div>
      {/* Agency header */}
      <div className="text-center mb-6">
        {agency.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agency.logo_url} alt={agency.name} className="h-12 mx-auto mb-3 object-contain" />
        ) : (
          <div className="w-14 h-14 bg-[#1B2B4B] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">{agency.name.charAt(0)}</span>
          </div>
        )}
        <h1 className="text-xl font-bold text-[#1B2B4B]">{agency.name}</h1>
        <p className="text-sm text-zinc-400 mt-1">Choisissez un créneau pour votre rendez-vous</p>
      </div>

      <BookingCalendar
        agencyId={agencyId}
        availableDays={avail?.days ?? [1, 2, 3, 4, 5]}
        advanceDays={avail?.advance_days ?? 30}
        slotDuration={avail?.slot_duration ?? 60}
      />
    </div>
  )
}
