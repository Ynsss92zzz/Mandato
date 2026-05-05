import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Rendez-vous' }

const STATUS_CONFIG = {
  planifie:  { label: 'Planifié',  bg: 'bg-blue-50',   text: 'text-blue-700',  icon: Clock },
  confirme:  { label: 'Confirmé', bg: 'bg-green-50',  text: 'text-green-700', icon: CheckCircle },
  annule:    { label: 'Annulé',   bg: 'bg-red-50',    text: 'text-red-700',   icon: XCircle },
  effectue:  { label: 'Effectué', bg: 'bg-zinc-100',  text: 'text-zinc-600',  icon: CheckCircle },
} as const

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

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
        Partagez votre lien de réservation à vos prospects pour qu&apos;ils réservent un créneau.
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

  type AppointmentRow = {
    id: string
    title: string
    status: 'planifie' | 'confirme' | 'annule' | 'effectue'
    scheduled_at: string
    duration_min: number
    location: string | null
    lead_id: string
  }

  let upcoming: AppointmentRow[] = []
  let past: AppointmentRow[] = []
  let leadNames: Record<string, string> = {}

  if (agencyId) {
    const now = new Date().toISOString()

    const [{ data: upcomingData }, { data: pastData }] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, title, status, scheduled_at, duration_min, location, lead_id')
        .eq('agency_id', agencyId)
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(20),
      supabase
        .from('appointments')
        .select('id, title, status, scheduled_at, duration_min, location, lead_id')
        .eq('agency_id', agencyId)
        .lt('scheduled_at', now)
        .order('scheduled_at', { ascending: false })
        .limit(10),
    ])

    upcoming = (upcomingData ?? []) as AppointmentRow[]
    past = (pastData ?? []) as AppointmentRow[]

    const allLeadIds = [...new Set([...upcoming, ...past].map((a) => a.lead_id))]
    if (allLeadIds.length > 0) {
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, first_name, last_name')
        .in('id', allLeadIds)
      ;(leadsData ?? []).forEach((l) => {
        leadNames[l.id] = `${l.first_name}${l.last_name ? ' ' + l.last_name : ''}`
      })
    }
  }

  const stats = {
    upcoming: upcoming.filter((a) => a.status !== 'annule').length,
    confirmed: upcoming.filter((a) => a.status === 'confirme').length,
    total: upcoming.length + past.length,
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mandato-app.vercel.app'
  const bookingUrl = agencyId ? `${appUrl}/booking/${agencyId}` : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1B2B4B]">Rendez-vous</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gérez vos rendez-vous clients</p>
        </div>
        {bookingUrl && (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Ma page de réservation
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'À venir', value: stats.upcoming, color: 'text-[#1B2B4B]' },
          { label: 'Confirmés', value: stats.confirmed, color: 'text-green-600' },
          { label: 'Total ce mois', value: stats.total, color: 'text-zinc-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">À venir</h2>
        {upcoming.length === 0 ? (
          <EmptyState agencyId={agencyId} />
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <div
                key={appt.id}
                className="bg-white rounded-xl border border-zinc-200 p-4 flex items-start gap-4"
              >
                {/* Date badge */}
                <div className="flex-none w-14 text-center bg-[#f0f3f9] rounded-xl py-2 px-1">
                  <p className="text-xs font-medium text-[#1B2B4B]/60 uppercase">
                    {new Date(appt.scheduled_at).toLocaleDateString('fr-FR', { month: 'short' })}
                  </p>
                  <p className="text-2xl font-bold text-[#1B2B4B] leading-tight">
                    {new Date(appt.scheduled_at).getDate()}
                  </p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-zinc-800 truncate">{appt.title}</h3>
                    <StatusBadge status={appt.status} />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(appt.scheduled_at)} · {appt.duration_min} min
                    </span>
                    {leadNames[appt.lead_id] && (
                      <Link
                        href={`/leads/${appt.lead_id}`}
                        className="flex items-center gap-1 hover:text-[#1B2B4B] transition-colors"
                      >
                        <User className="w-3.5 h-3.5" />
                        {leadNames[appt.lead_id]}
                      </Link>
                    )}
                    {appt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {appt.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
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
              <div
                key={appt.id}
                className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center gap-4 opacity-70"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-600 text-sm truncate">{appt.title}</span>
                    <StatusBadge status={appt.status} />
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatDate(appt.scheduled_at)} à {formatTime(appt.scheduled_at)}
                    {leadNames[appt.lead_id] ? ` · ${leadNames[appt.lead_id]}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking link info */}
      {bookingUrl && (
        <div className="bg-[#f0f3f9] rounded-xl p-4">
          <p className="text-sm font-medium text-[#1B2B4B] mb-1">Votre lien de réservation</p>
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
