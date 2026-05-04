import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import type { AnalyticsData } from '@/components/analytics/analytics-dashboard'

export const metadata: Metadata = { title: 'Analytics — Mandato' }

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  qualifie: 'Qualifié',
  rdv_planifie: 'RDV planifié',
  proposition: 'Proposition',
  gagne: 'Gagné',
  perdu: 'Perdu',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check plan
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .single()

  const isAgencePlan = subscription?.plan === 'agence'

  if (!isAgencePlan) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B] mb-6">Analytics</h1>
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#1B2B4B] mb-1">Plan Agence requis</p>
          <p className="text-xs text-zinc-400 mb-5 max-w-xs">
            Les analytics avancés sont disponibles à partir du plan Agence à 149€/mois.
          </p>
          <a
            href="/settings/billing"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#FF8C5A] transition-colors"
          >
            Passer au plan Agence
          </a>
        </div>
      </div>
    )
  }

  // Fetch all leads
  const { data: leads } = await supabase
    .from('leads')
    .select('status, source, created_at, assigned_to')
    .order('created_at', { ascending: true })

  const allLeads = leads ?? []
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const leadsThisMonth = allLeads.filter((l) => new Date(l.created_at) >= startOfMonth).length
  const leadsLastMonth = allLeads.filter((l) => {
    const d = new Date(l.created_at)
    return d >= startOfLastMonth && d < startOfMonth
  }).length
  const wonLeads = allLeads.filter((l) => l.status === 'gagne').length
  const conversionRate = allLeads.length > 0 ? Math.round((wonLeads / allLeads.length) * 100) : 0

  // RDV count
  const { count: rdvCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })

  // By source
  const sourceMap: Record<string, number> = {}
  for (const l of allLeads) {
    sourceMap[l.source] = (sourceMap[l.source] ?? 0) + 1
  }
  const bySource = Object.entries(sourceMap)
    .sort(([, a], [, b]) => b - a)
    .map(([source, count]) => ({
      source,
      count,
      percent: allLeads.length > 0 ? Math.round((count / allLeads.length) * 100) : 0,
    }))

  // By status (funnel order)
  const statusOrder = ['nouveau', 'contacte', 'qualifie', 'rdv_planifie', 'proposition', 'gagne', 'perdu']
  const statusMap: Record<string, number> = {}
  for (const l of allLeads) {
    statusMap[l.status] = (statusMap[l.status] ?? 0) + 1
  }
  const maxStatusCount = Math.max(...Object.values(statusMap), 1)
  const byStatus = statusOrder
    .filter((s) => statusMap[s] !== undefined)
    .map((status) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      count: statusMap[status] ?? 0,
      percent: Math.round(((statusMap[status] ?? 0) / maxStatusCount) * 100),
    }))

  // Weekly trend — last 8 weeks
  const weeklyTrend: AnalyticsData['weeklyTrend'] = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - i * 7 - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const count = allLeads.filter((l) => {
      const d = new Date(l.created_at)
      return d >= weekStart && d < weekEnd
    }).length

    const label = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    weeklyTrend.push({ label, count })
  }

  // Agent stats
  const agentProfileIds = [...new Set(allLeads.map((l) => l.assigned_to).filter(Boolean))] as string[]
  let agentStats: AnalyticsData['agentStats'] = null

  if (agentProfileIds.length > 0) {
    const { data: agentProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', agentProfileIds)

    agentStats = (agentProfiles ?? []).map((p) => {
      const agentLeads = allLeads.filter((l) => l.assigned_to === p.id)
      const won = agentLeads.filter((l) => l.status === 'gagne').length
      return {
        name: p.full_name ?? 'Sans nom',
        email: p.email ?? '—',
        total: agentLeads.length,
        won,
        rate: agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0,
      }
    }).sort((a, b) => b.total - a.total)
  }

  const analyticsData: AnalyticsData = {
    totalLeads: allLeads.length,
    leadsThisMonth,
    leadsLastMonth,
    wonLeads,
    conversionRate,
    rdvCount: rdvCount ?? 0,
    bySource,
    byStatus,
    weeklyTrend,
    agentStats,
  }

  return <AnalyticsDashboard data={analyticsData} />
}
