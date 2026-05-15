import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SmartAlerts } from '@/components/dashboard/smart-alerts'
import {
  Users,
  TrendingUp,
  Calendar,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Wrench,
  AlertCircle,
  Flame,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Tableau de bord' }

// ─── Types ──────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: { value: number; label: string }
  icon: React.ReactNode
}

// ─── Composants ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, subtext, trend, icon }: MetricCardProps) {
  const trendUp = trend && trend.value >= 0
  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
        <span className="text-[#F97316]">{icon}</span>
      </div>
      <div>
        <p className="text-4xl font-semibold text-zinc-900 tracking-tight leading-none">{value}</p>
        {subtext && <p className="text-xs text-zinc-400 mt-2">{subtext}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  qualifie: 'Qualifié',
  rdv_planifie: 'RDV planifié',
  proposition: 'Proposition',
  gagne: 'Gagné',
  perdu: 'Perdu',
}

const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-zinc-100 text-zinc-600',
  contacte: 'bg-blue-50 text-blue-600',
  qualifie: 'bg-violet-50 text-violet-600',
  rdv_planifie: 'bg-orange-50 text-[#F97316]',
  proposition: 'bg-indigo-50 text-indigo-600',
  gagne: 'bg-emerald-50 text-emerald-600',
  perdu: 'bg-zinc-100 text-zinc-400',
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const [
    { count: totalLeads },
    { count: leadsToday },
    { count: leadsThisMonth },
    { count: leadsLastMonth },
    { count: rdvWeek },
    { count: leadsGagnes },
    { data: recentLeads },
    { data: subscription },
    { data: hotLeads },
    { data: activeLeadsWithBudget },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('scheduled_at', startOfWeek).eq('status', 'planifie'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'gagne'),
    supabase.from('leads').select('id, first_name, last_name, email, status, source, ai_score, created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('subscriptions').select('plan, status, leads_this_month, trial_ends_at').single(),
    supabase.from('leads').select('id, first_name, last_name, phone, budget, ai_score').gt('ai_score', 7).in('status', ['nouveau', 'contacte', 'qualifie', 'rdv_planifie', 'proposition']).order('ai_score', { ascending: false }).limit(3),
    supabase.from('leads').select('budget').in('status', ['nouveau', 'contacte', 'qualifie', 'rdv_planifie', 'proposition']).not('budget', 'is', null),
  ])

  const conversionRate = totalLeads ? Math.round(((leadsGagnes ?? 0) / totalLeads) * 100) : 0
  const monthTrend = leadsLastMonth ? Math.round((((leadsThisMonth ?? 0) - leadsLastMonth) / leadsLastMonth) * 100) : 0

  const totalBudget = (activeLeadsWithBudget ?? []).reduce((sum, l) => sum + (l.budget ?? 0), 0)
  const potentialCommission = totalBudget * 0.03
  const fmtCurrency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const isStarter = subscription?.plan === 'starter'
  const isProOrAgence = subscription?.plan === 'pro' || subscription?.plan === 'agence'

  const leadsQuotaUsed = subscription?.leads_this_month ?? 0
  const leadsQuotaPercent = isStarter ? Math.round((leadsQuotaUsed / 50) * 100) : 0

  const userName = (user.user_metadata?.full_name as string)?.split(' ')[0] ?? 'là'

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Bonjour, {userName}</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{formatDate(now.toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link
          href="/leads"
          className="bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau lead
        </Link>
      </div>

      {/* Bandeau upgrade Starter */}
      {isStarter && (
        <div className="rounded-xl border border-[#F97316]/20 bg-orange-50/60 px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-[#F97316] flex-shrink-0" />
            <p className="text-sm text-zinc-700">
              Passez au plan Pro — leads illimités, SMS, WhatsApp et analytics avancés
            </p>
          </div>
          <Link
            href="/settings/billing"
            className="shrink-0 text-xs font-semibold text-[#F97316] hover:text-[#FB923C] whitespace-nowrap transition-colors"
          >
            Voir le plan Pro →
          </Link>
        </div>
      )}

      {/* Alerte quota Starter */}
      {isStarter && leadsQuotaPercent >= 70 && (
        <div className={`rounded-xl border px-5 py-3.5 flex items-center justify-between gap-4 ${leadsQuotaPercent >= 90 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-4 h-4 flex-shrink-0 ${leadsQuotaPercent >= 90 ? 'text-red-500' : 'text-[#F97316]'}`} />
            <div>
              <p className={`text-sm font-medium ${leadsQuotaPercent >= 90 ? 'text-red-700' : 'text-zinc-800'}`}>
                {leadsQuotaPercent >= 90 ? 'Quota presque atteint' : 'Quota leads bientôt atteint'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {leadsQuotaUsed}/50 leads ce mois — passez en Pro pour des leads illimités
              </p>
            </div>
          </div>
          <Link
            href="/settings/billing"
            className={`shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-md transition-colors ${leadsQuotaPercent >= 90 ? 'bg-red-500 hover:bg-red-600' : 'bg-[#F97316] hover:bg-[#FB923C]'}`}
          >
            Passer en Pro
          </Link>
        </div>
      )}

      {/* Alertes intelligentes */}
      <SmartAlerts />

      {/* Leads chauds — Pro/Agence */}
      {isProOrAgence && hotLeads && hotLeads.length > 0 && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#F97316]" />
              Leads chauds — à appeler en priorité
            </h2>
            <Link href="/leads" className="text-xs text-zinc-400 hover:text-zinc-600 font-medium transition-colors">
              Voir tous →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hotLeads.map((lead) => {
              const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
              const budget = lead.budget
                ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(lead.budget)
                : null
              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="bg-zinc-50 rounded-lg border border-zinc-100 p-4 hover:border-zinc-200 hover:bg-white transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{name}</p>
                    <span className="ml-2 shrink-0 text-xs font-semibold bg-orange-50 text-[#F97316] px-1.5 py-0.5 rounded">
                      {lead.ai_score}/10
                    </span>
                  </div>
                  {lead.phone && (
                    <p className="text-xs text-zinc-500 mb-1">{lead.phone}</p>
                  )}
                  {budget && (
                    <p className="text-xs text-zinc-400">{budget}</p>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Nouveaux leads"
          value={leadsToday ?? 0}
          subtext="aujourd'hui"
          icon={<Users className="w-4 h-4" />}
          trend={{ value: monthTrend, label: 'vs mois dernier' }}
        />
        <MetricCard
          label="Leads ce mois"
          value={leadsThisMonth ?? 0}
          subtext={isStarter ? `sur 30 (plan Starter)` : 'illimités (plan Pro/Agence)'}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          label="RDV cette semaine"
          value={rdvWeek ?? 0}
          subtext="planifiés"
          icon={<Calendar className="w-4 h-4" />}
        />
        <MetricCard
          label="Taux de conversion"
          value={`${conversionRate}%`}
          subtext={`${leadsGagnes ?? 0} leads gagnés`}
          icon={<Zap className="w-4 h-4" />}
        />
      </div>

      {/* Tableau 2 colonnes : leads récents + actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads récents */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-800">Derniers leads</h2>
            <Link href="/leads" className="text-xs text-zinc-400 hover:text-zinc-600 font-medium transition-colors">
              Voir tout →
            </Link>
          </div>
          {recentLeads && recentLeads.length > 0 ? (
            <div className="divide-y divide-zinc-50">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/70 transition-colors group"
                >
                  <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-600 text-[11px] font-semibold">
                      {lead.first_name[0]}{lead.last_name?.[0] ?? ''}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{lead.email ?? 'Pas d\'email'}</p>
                  </div>
                  {lead.ai_score && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                      lead.ai_score >= 7 ? 'bg-emerald-50 text-emerald-600' :
                      lead.ai_score >= 4 ? 'bg-yellow-50 text-yellow-600' :
                      'bg-red-50 text-red-500'
                    }`}>
                      {lead.ai_score}
                    </div>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLORS[lead.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                  <span className="text-xs text-zinc-300 hidden sm:block flex-shrink-0 w-16 text-right">
                    {formatRelativeTime(lead.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-zinc-300" />
              </div>
              <p className="text-sm font-medium text-zinc-600">Aucun lead pour l&apos;instant</p>
              <p className="text-xs text-zinc-400 mt-1">Ajoutez votre premier lead ou installez le widget sur votre site</p>
              <Link href="/leads" className="mt-4 text-xs text-[#F97316] font-medium hover:underline">
                Ajouter un lead →
              </Link>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Actions rapides */}
          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <h2 className="text-sm font-semibold text-zinc-800 mb-3">Actions rapides</h2>
            <div className="space-y-0.5">
              {[
                { href: '/leads', label: 'Ajouter un lead', desc: 'Saisie manuelle', icon: Plus },
                { href: '/sequences', label: 'Créer une séquence', desc: 'Relances auto', icon: Zap },
                { href: '/settings/integrations', label: 'Installer le widget', desc: 'Capturer les leads du site', icon: Wrench },
                { href: '/appointments', label: 'Voir les RDV', desc: `${rdvWeek ?? 0} cette semaine`, icon: Calendar },
              ].map(({ href, label, desc, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors group"
                >
                  <Icon className="w-4 h-4 text-zinc-300 group-hover:text-[#F97316] transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-700">{label}</p>
                    <p className="text-xs text-zinc-400">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Résumé du mois */}
          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <h2 className="text-sm font-semibold text-zinc-800 mb-3">Résumé du mois</h2>
            <div className="space-y-3">
              {[
                { label: 'Leads créés', value: leadsThisMonth ?? 0 },
                { label: 'Leads gagnés', value: leadsGagnes ?? 0 },
                { label: 'Conversion', value: `${conversionRate}%` },
                ...(potentialCommission > 0 ? [{ label: 'Commission potentielle', value: fmtCurrency.format(potentialCommission) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">{label}</span>
                  <span className="text-sm font-semibold text-zinc-800">{value}</span>
                </div>
              ))}

              {isStarter && (
                <div className="pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-400">Quota leads</span>
                    <span className="text-xs font-medium text-zinc-600">{leadsQuotaUsed}/50</span>
                  </div>
                  <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${leadsQuotaPercent >= 90 ? 'bg-red-500' : leadsQuotaPercent >= 70 ? 'bg-[#F97316]' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(leadsQuotaPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
