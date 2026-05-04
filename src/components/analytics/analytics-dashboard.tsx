'use client'

import { useState, useTransition } from 'react'

export interface AnalyticsData {
  totalLeads: number
  leadsThisMonth: number
  leadsLastMonth: number
  wonLeads: number
  conversionRate: number
  rdvCount: number
  bySource: Array<{ source: string; count: number; percent: number }>
  byStatus: Array<{ status: string; label: string; count: number; percent: number }>
  weeklyTrend: Array<{ label: string; count: number }>
  agentStats: Array<{ name: string; email: string; total: number; won: number; rate: number }> | null
}

const SOURCE_LABELS: Record<string, string> = {
  widget: 'Widget site',
  seloger: 'SeLoger',
  leboncoin: 'Leboncoin',
  logicimmo: 'LogicImmo',
  manuel: 'Manuel',
  import: 'Import',
  autre: 'Autre',
}

function KPICard({
  label,
  value,
  sub,
  trend,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  trend?: { value: number; label: string }
  icon: string
}) {
  const isPositive = (trend?.value ?? 0) >= 0

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-[#1B2B4B] mb-0.5">{value}</p>
      <p className="text-sm text-zinc-400">{label}</p>
      {sub && <p className="text-xs text-zinc-300 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarChart({ data }: { data: AnalyticsData['weeklyTrend'] }) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-zinc-400 font-medium">{d.count}</span>
          <div
            className="w-full rounded-t-lg bg-[#1B2B4B] transition-all"
            style={{ height: `${Math.max((d.count / max) * 96, d.count > 0 ? 8 : 2)}px` }}
          />
          <span className="text-xs text-zinc-400 whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const [isSending, startSend] = useTransition()
  const [sendResult, setSendResult] = useState<string | null>(null)

  const trendPercent = data.leadsLastMonth > 0
    ? Math.round(((data.leadsThisMonth - data.leadsLastMonth) / data.leadsLastMonth) * 100)
    : data.leadsThisMonth > 0 ? 100 : 0

  function handlePrint() {
    window.print()
  }

  function handleSendReport() {
    setSendResult(null)
    startSend(async () => {
      const res = await fetch('/api/reports/send', { method: 'POST' })
      if (res.ok) {
        setSendResult('Rapport envoyé par email ✓')
      } else {
        setSendResult('Erreur lors de l\'envoi')
      }
      setTimeout(() => setSendResult(null), 4000)
    })
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1B2B4B]">Analytics</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Tableau de bord de performance</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handleSendReport}
            disabled={isSending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isSending ? 'Envoi...' : 'Rapport par email'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B4B] rounded-lg hover:bg-[#2D4270] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer PDF
          </button>
        </div>
      </div>

      {sendResult && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-700">
          {sendResult}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon="📋"
          label="Total des leads"
          value={data.totalLeads}
          sub={`${data.leadsThisMonth} ce mois`}
          trend={{ value: trendPercent, label: 'vs mois dernier' }}
        />
        <KPICard
          icon="🏆"
          label="Leads gagnés"
          value={data.wonLeads}
          sub="Transactions conclues"
        />
        <KPICard
          icon="📈"
          label="Taux de conversion"
          value={`${data.conversionRate}%`}
          sub="Nouveau → Gagné"
        />
        <KPICard
          icon="📅"
          label="Rendez-vous"
          value={data.rdvCount}
          sub="Total planifiés"
        />
      </div>

      {/* Two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sources */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Sources de leads</h2>
          <div className="space-y-3">
            {data.bySource.length === 0 && (
              <p className="text-sm text-zinc-400">Aucune donnée</p>
            )}
            {data.bySource.map((s) => (
              <div key={s.source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-600">
                    {SOURCE_LABELS[s.source] ?? s.source}
                  </span>
                  <span className="text-xs text-zinc-400">{s.count} ({s.percent}%)</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF6B35] rounded-full transition-all"
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Entonnoir de conversion</h2>
          <div className="space-y-2">
            {data.byStatus.length === 0 && (
              <p className="text-sm text-zinc-400">Aucune donnée</p>
            )}
            {data.byStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-28 flex-none truncate">{s.label}</span>
                <div className="flex-1 h-6 bg-zinc-50 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-[#1B2B4B]/10 rounded-lg flex items-center px-2 transition-all"
                    style={{ width: `${Math.max(s.percent, 4)}%` }}
                  >
                    <span className="text-xs font-medium text-[#1B2B4B]">{s.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-5">Leads par semaine (8 dernières semaines)</h2>
        <BarChart data={data.weeklyTrend} />
      </div>

      {/* Agent performance */}
      {data.agentStats && data.agentStats.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-[#1B2B4B]">Performance par agent</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Total leads</th>
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Gagnés</th>
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Taux de conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {data.agentStats.map((agent, i) => (
                <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-[#1B2B4B]">{agent.name}</p>
                    <p className="text-xs text-zinc-400">{agent.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#1B2B4B]">{agent.total}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#1B2B4B]">{agent.won}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full"
                          style={{ width: `${agent.rate}%` }}
                        />
                      </div>
                      <span className="text-sm text-zinc-600">{agent.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
