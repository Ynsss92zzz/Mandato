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

  const plan = subscription?.plan ?? 'starter'
  const isAgencePlan = plan === 'agence'
  const isProOrAgence = plan === 'pro' || plan === 'agence'

  if (!isProOrAgence) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B] mb-6">Analytics</h1>
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#1B2B4B] mb-1">Plan Pro requis</p>
          <p className="text-xs text-zinc-400 mb-5 max-w-xs">
            Les statistiques sont disponibles à partir du plan Pro à 79€/mois.
          </p>
          <a
            href="/settings/billing"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#FF8C5A] transition-colors"
          >
            Passer au plan Pro
          </a>
        </div>
      </div>
    )
  }

  // Pro plan: basic analytics (source conversion + incoming messages by hour)
  if (!isAgencePlan) {
    const [{ data: leads }, { data: messages }] = await Promise.all([
      supabase.from('leads').select('status, source'),
      supabase.from('messages').select('sent_at').eq('direction', 'entrant'),
    ])

    const allLeads = leads ?? []
    const wonLeads = allLeads.filter(l => l.status === 'gagne')

    const sourceMap: Record<string, { total: number; won: number }> = {}
    for (const l of allLeads) {
      if (!sourceMap[l.source]) sourceMap[l.source] = { total: 0, won: 0 }
      sourceMap[l.source].total++
      if (l.status === 'gagne') sourceMap[l.source].won++
    }
    const sourceStats = Object.entries(sourceMap)
      .map(([source, { total, won }]) => ({
        source,
        total,
        won,
        rate: total > 0 ? Math.round((won / total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)

    const hourMap: Record<number, number> = {}
    for (const m of messages ?? []) {
      if (!m.sent_at) continue
      const h = new Date(m.sent_at).getHours()
      hourMap[h] = (hourMap[h] ?? 0) + 1
    }
    const maxHourCount = Math.max(...Object.values(hourMap), 1)
    const hourStats = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourMap[h] ?? 0,
      pct: Math.round(((hourMap[h] ?? 0) / maxHourCount) * 100),
    }))
    const peakHour = hourStats.reduce((best, cur) => cur.count > best.count ? cur : best, hourStats[0])

    const SOURCE_LABELS: Record<string, string> = {
      widget: 'Widget', seloger: 'SeLoger', leboncoin: 'Leboncoin',
      logicimmo: 'Logic-Immo', manuel: 'Manuel', import: 'Import', autre: 'Autre',
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1B2B4B]">Analytics</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Statistiques basiques · plan Pro</p>
          </div>
          <span className="text-xs bg-[#f0f3f9] text-[#1B2B4B] px-3 py-1 rounded-full font-medium">
            {allLeads.length} leads · {wonLeads.length} gagnés
          </span>
        </div>

        <section className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="font-semibold text-zinc-800 mb-4">Taux de conversion par source</h2>
          {sourceStats.length === 0 ? (
            <p className="text-sm text-zinc-400">Pas encore de données</p>
          ) : (
            <div className="space-y-3">
              {sourceStats.map(s => (
                <div key={s.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-700">{SOURCE_LABELS[s.source] ?? s.source}</span>
                    <span className="text-sm text-zinc-500">
                      {s.won}/{s.total} — <span className="font-semibold text-[#1B2B4B]">{s.rate}%</span>
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: `${s.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-800">Messages entrants par heure</h2>
            {peakHour.count > 0 && (
              <span className="text-xs text-zinc-500">
                Pic à <span className="font-semibold text-[#1B2B4B]">{peakHour.hour}h</span>
              </span>
            )}
          </div>
          <div className="flex items-end gap-0.5 h-24">
            {hourStats.map(h => (
              <div key={h.hour} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-sm ${h.count > 0 ? 'bg-[#1B2B4B]' : 'bg-zinc-100'}`}
                  style={{ height: `${Math.max(h.pct, h.count > 0 ? 6 : 0)}%` }}
                  title={`${h.hour}h : ${h.count} msg`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-zinc-400">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </section>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 text-sm text-amber-700">
          Passez au plan <strong>Agence</strong> pour accéder aux analytics avancés : prédiction IA, stats par agent et heatmap.{' '}
          <a href="/settings/billing" className="underline font-medium">Voir les plans →</a>
        </div>
      </div>
    )
  }

  // Fetch all leads
  const { data: leads } = await supabase
    .from('leads')
    .select('status, source, created_at, assigned_to, ai_score')
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
        id: p.id,
        name: p.full_name ?? 'Sans nom',
        email: p.email ?? '—',
        total: agentLeads.length,
        won,
        rate: agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0,
      }
    }).sort((a, b) => b.total - a.total)
  }

  // AI prediction
  const scored = allLeads.filter(l => l.ai_score != null)
  const aiPrediction = scored.length > 0 ? {
    avgScore: Math.round(scored.reduce((s, l) => s + (l.ai_score ?? 0), 0) / scored.length * 10) / 10,
    highPotential: scored.filter(l => (l.ai_score ?? 0) >= 7).length,
    totalScored: scored.length,
    distribution: {
      low: scored.filter(l => (l.ai_score ?? 0) <= 3).length,
      medium: scored.filter(l => (l.ai_score ?? 0) >= 4 && (l.ai_score ?? 0) <= 6).length,
      high: scored.filter(l => (l.ai_score ?? 0) >= 7).length,
    },
  } : undefined

  // Response heatmap: [day 0-6][hour 0-23]
  const { data: inboundMessages } = await supabase
    .from('messages')
    .select('sent_at')
    .eq('direction', 'entrant')

  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const m of inboundMessages ?? []) {
    if (!m.sent_at) continue
    const d = new Date(m.sent_at)
    heatmap[d.getDay()][d.getHours()]++
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
    aiPrediction,
    responseHeatmap: heatmap,
  }

  return <AnalyticsDashboard data={analyticsData} />
}
