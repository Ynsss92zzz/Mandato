import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const STYLES = {
  warning: 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100',
  rdv: 'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100',
  new: 'bg-green-50 border border-green-200 text-green-900 hover:bg-green-100',
}

export async function SmartAlerts() {
  const supabase = await createClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

  const [
    { count: overdueCount },
    { data: upcomingAppts },
    { data: freshLeads },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('status', ['nouveau', 'contacte'])
      .or(`last_contacted_at.is.null,last_contacted_at.lte.${sevenDaysAgo}`),
    supabase
      .from('appointments')
      .select('id, title, scheduled_at')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', twoHoursFromNow)
      .eq('status', 'planifie')
      .order('scheduled_at', { ascending: true })
      .limit(3),
    supabase
      .from('leads')
      .select('id, first_name, last_name, created_at')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  type Alert = { key: string; icon: string; text: string; href: string; style: string }
  const alerts: Alert[] = []

  // Leads non contactés depuis 7 jours
  if (overdueCount && overdueCount > 0) {
    const n = overdueCount
    alerts.push({
      key: 'overdue',
      icon: '⚠️',
      text: `${n} lead${n > 1 ? 's' : ''} non contacté${n > 1 ? 's' : ''} depuis 7 jours`,
      href: '/leads',
      style: STYLES.warning,
    })
  }

  // RDV dans moins de 2h
  for (const appt of upcomingAppts ?? []) {
    const diff = new Date(appt.scheduled_at).getTime() - now.getTime()
    const totalMins = Math.round(diff / 60_000)
    const label =
      totalMins < 60
        ? `${totalMins} min`
        : `${Math.floor(totalMins / 60)}h${totalMins % 60 > 0 ? String(totalMins % 60).padStart(2, '0') : ''}`
    alerts.push({
      key: `rdv-${appt.id}`,
      icon: '📅',
      text: `RDV "${appt.title}" dans ${label}`,
      href: '/appointments',
      style: STYLES.rdv,
    })
  }

  // Nouveaux leads dans les 30 dernières minutes
  for (const lead of freshLeads ?? []) {
    const diffMins = Math.round((now.getTime() - new Date(lead.created_at).getTime()) / 60_000)
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    const when = diffMins === 0 ? "à l'instant" : `il y a ${diffMins} min`
    alerts.push({
      key: `new-${lead.id}`,
      icon: '🆕',
      text: `Nouveau lead "${name}" reçu ${when}`,
      href: `/leads/${lead.id}`,
      style: STYLES.new,
    })
  }

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Link
          key={alert.key}
          href={alert.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${alert.style}`}
        >
          <span className="text-base shrink-0">{alert.icon}</span>
          <span className="flex-1">{alert.text}</span>
          <svg className="w-4 h-4 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ))}
    </div>
  )
}
