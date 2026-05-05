import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar } from 'lucide-react'
import { NewPersonalAppointmentModal } from '@/components/appointments/new-personal-appointment-modal'
import { AppointmentCard, type AppointmentRow, type LeadInfo } from '@/components/appointments/appointment-card'

export const metadata: Metadata = { title: 'Rendez-vous' }

function EmptyState({ agencyId }: { agencyId: string | undefined }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mandato-app.vercel.app'
  const bookingUrl = agencyId ? `${appUrl}/booking/${agencyId}` : null
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-16 text-center">
      <div className="w-16 h-16 bg-[#f0f3f9] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-8 h-8 text-[#1B2B4B]/40" />
      </div>
      <h3 className="font-semibold text-zinc-800 mb-1">Aucun rendez-vous à venir</h3>
      <p className="text-sm text-zinc-400 mb-6 max-w-xs mx-auto">
        Créez un RDV personnel ou partagez votre lien de réservation à vos prospects.
      </p>
      {bookingUrl && (
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#1B2B4B] hover:bg-[#2D4270] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          Voir ma page de réservation
        </a>
      )}
    </div>
  )
}

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  const agencyId = member?.agency_id

  let upcoming: AppointmentRow[] = []
  let past: AppointmentRow[] = []
  let leads: Record<string, LeadInfo> = {}

  if (agencyId) {
    const now = new Date().toISOString()
    const cols = 'id, title, type, category, status, scheduled_at, duration_min, location, notes, lead_id'

    const [{ data: upcomingData }, { data: pastData }] = await Promise.all([
      supabase
        .from('appointments')
        .select(cols)
        .eq('agency_id', agencyId)
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(20),
      supabase
        .from('appointments')
        .select(cols)
        .eq('agency_id', agencyId)
        .lt('scheduled_at', now)
        .order('scheduled_at', { ascending: false })
        .limit(10),
    ])

    upcoming = (upcomingData ?? []) as AppointmentRow[]
    past = (pastData ?? []) as AppointmentRow[]

    const allLeadIds = [
      ...new Set(
        [...upcoming, ...past]
          .map((a) => a.lead_id)
          .filter((id): id is string => !!id)
      ),
    ]

    if (allLeadIds.length > 0) {
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .in('id', allLeadIds)
      ;(leadsData ?? []).forEach((l) => {
        leads[l.id] = {
          name: `${l.first_name}${l.last_name ? ' ' + l.last_name : ''}`,
          email: l.email ?? null,
        }
      })
    }
  }

  const stats = {
    client:   upcoming.filter((a) => a.type === 'client'   && a.status !== 'annule').length,
    personal: upcoming.filter((a) => a.type === 'personal' && a.status !== 'annule').length,
    total:    upcoming.length + past.length,
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mandato-app.vercel.app'
  const bookingUrl = agencyId ? `${appUrl}/booking/${agencyId}` : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[#1B2B4B]">Rendez-vous</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gérez vos rendez-vous clients et personnels</p>
        </div>
        <div className="flex items-center gap-3">
          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white border border-zinc-200 hover:border-[#1B2B4B] text-zinc-700 hover:text-[#1B2B4B] text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              Ma page de réservation
            </a>
          )}
          <NewPersonalAppointmentModal />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            RDV clients à venir
          </p>
          <p className="text-2xl font-bold text-blue-700">{stats.client}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF6B35] inline-block" />
            RDV personnels à venir
          </p>
          <p className="text-2xl font-bold text-[#FF6B35]">{stats.personal}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-400 mb-1">Total ce mois</p>
          <p className="text-2xl font-bold text-zinc-700">{stats.total}</p>
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">À venir</h2>
        {upcoming.length === 0 ? (
          <EmptyState agencyId={agencyId} />
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                lead={appt.lead_id ? (leads[appt.lead_id] ?? null) : null}
                variant="upcoming"
              />
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Passés</h2>
          <div className="space-y-2">
            {past.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                lead={appt.lead_id ? (leads[appt.lead_id] ?? null) : null}
                variant="past"
              />
            ))}
          </div>
        </div>
      )}

      {/* Booking link info */}
      {bookingUrl && (
        <div className="bg-[#f0f3f9] rounded-xl p-4">
          <p className="text-sm font-medium text-[#1B2B4B] mb-1">Votre lien de réservation clients</p>
          <p className="text-xs text-zinc-500">
            Configurez vos disponibilités dans{' '}
            <Link href="/settings/availability" className="underline hover:text-[#1B2B4B]">
              Paramètres → Disponibilités
            </Link>{' '}
            puis partagez votre lien aux prospects.
          </p>
        </div>
      )}
    </div>
  )
}
