import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PrintTrigger, PrintButton } from '@/components/analytics/print-controls'

export const metadata: Metadata = { title: 'Rapport agent — Mandato' }

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau', contacte: 'Contacté', qualifie: 'Qualifié',
  rdv_planifie: 'RDV planifié', proposition: 'Proposition', gagne: 'Gagné', perdu: 'Perdu',
}

const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-zinc-100 text-zinc-600',
  contacte: 'bg-blue-50 text-blue-700',
  qualifie: 'bg-purple-50 text-purple-700',
  rdv_planifie: 'bg-amber-50 text-amber-700',
  proposition: 'bg-orange-50 text-orange-700',
  gagne: 'bg-green-50 text-green-700',
  perdu: 'bg-red-50 text-red-600',
}

export default async function AgentReportPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: sub } = await supabase.from('subscriptions').select('plan').single()
  if (sub?.plan !== 'agence') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-zinc-500">Plan Agence requis pour accéder aux rapports.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', agentId)
    .single()

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-zinc-500">Agent introuvable.</p>
      </div>
    )
  }

  const { data: leads } = await supabase
    .from('leads')
    .select('id, first_name, last_name, status, source, ai_score, created_at')
    .eq('assigned_to', agentId)
    .order('created_at', { ascending: false })

  const agentLeads = leads ?? []
  const wonLeads = agentLeads.filter(l => l.status === 'gagne')
  const conversionRate = agentLeads.length > 0
    ? Math.round((wonLeads.length / agentLeads.length) * 100)
    : 0

  const scored = agentLeads.filter(l => l.ai_score != null)
  const avgScore = scored.length > 0
    ? (scored.reduce((s, l) => s + (l.ai_score ?? 0), 0) / scored.length).toFixed(1)
    : null

  const leadIds = agentLeads.map(l => l.id)
  let rdvTotal = 0
  let rdvDone = 0
  if (leadIds.length > 0) {
    const [{ count: total }, { count: done }] = await Promise.all([
      supabase.from('appointments').select('id', { count: 'exact', head: true }).in('lead_id', leadIds),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).in('lead_id', leadIds).eq('status', 'effectue'),
    ])
    rdvTotal = total ?? 0
    rdvDone = done ?? 0
  }

  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const kpis = [
    { label: 'Total leads', value: agentLeads.length, icon: '📋' },
    { label: 'Leads gagnés', value: wonLeads.length, icon: '🏆' },
    { label: 'Taux de conversion', value: `${conversionRate}%`, icon: '📈' },
    { label: 'RDV effectués', value: `${rdvDone} / ${rdvTotal}`, icon: '📅' },
    ...(avgScore ? [{ label: 'Score IA moyen', value: `${avgScore}/10`, icon: '🤖' }] : []),
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-5 print:max-w-none print:space-y-4">
      <PrintTrigger />

      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/analytics"
          className="text-sm text-zinc-500 hover:text-[#1B2B4B] flex items-center gap-1 transition-colors"
        >
          ← Retour aux analytics
        </Link>
        <PrintButton className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1B2B4B] rounded-lg hover:bg-[#2D4270] transition-colors" />
      </div>

      {/* Report card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 print:border-none print:p-0 print:shadow-none">

        {/* Header */}
        <div className="flex items-start justify-between pb-6 mb-6 border-b border-zinc-100">
          <div>
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-wider mb-1.5">
              Rapport de performance
            </p>
            <h1 className="text-2xl font-bold text-[#1B2B4B]">
              {profile.full_name ?? 'Agent sans nom'}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">{profile.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400 mb-0.5">Généré le</p>
            <p className="text-sm font-medium text-zinc-600">{generatedAt}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {kpis.map(k => (
            <div key={k.label} className="bg-[#f0f3f9] rounded-xl p-4">
              <p className="text-xl mb-1.5">{k.icon}</p>
              <p className="text-2xl font-bold text-[#1B2B4B] leading-none">{k.value}</p>
              <p className="text-xs text-zinc-500 mt-1 leading-tight">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Lead table */}
        {agentLeads.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Aucun lead assigné à cet agent.</p>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-[#1B2B4B] mb-3">
              Leads assignés ({agentLeads.length})
            </h2>
            <div className="border border-zinc-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Lead</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Statut</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Score IA</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Créé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {agentLeads.map(lead => (
                    <tr key={lead.id}>
                      <td className="px-4 py-3 font-medium text-[#1B2B4B]">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {lead.ai_score != null ? `${lead.ai_score}/10` : '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
