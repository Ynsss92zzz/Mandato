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
  Clock,
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
  accent?: boolean
}

// ─── Composants ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, subtext, trend, icon, accent }: MetricCardProps) {
  const trendUp = trend && trend.value >= 0
  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 ${accent ? 'border-[#FF6B35]/30 ring-1 ring-[#FF6B35]/10' : 'border-zinc-100'}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-[#FF6B35]/10 text-[#FF6B35]' : 'bg-[#f0f3f9] text-[#1B2B4B]'}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-[#1B2B4B]">{value}</p>
        {subtext && <p className="text-xs text-zinc-400 mt-0.5">{subtext}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
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
  nouveau: 'bg-blue-50 text-blue-700',
  contacte: 'bg-yellow-50 text-yellow-700',
  qualifie: 'bg-purple-50 text-purple-700',
  rdv_planifie: 'bg-[#fff4f0] text-[#FF6B35]-700',
  proposition: 'bg-indigo-50 text-indigo-700',
  gagne: 'bg-green-50 text-green-700',
  perdu: 'bg-zinc-100 text-zinc-500',
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

  // Toutes les requêtes en parallèle
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

  // Alerte quota Starter
  const leadsQuotaUsed = subscription?.leads_this_month ?? 0
  const leadsQuotaPercent = isStarter ? Math.round((leadsQuotaUsed / 50) * 100) : 0

  const userName = (user.user_metadata?.full_name as string)?.split(' ')[0] ?? 'là'

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B]">Bonjour, {userName} 👋</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{formatDate(now.toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link
          href="/leads"
          className="bg-[#FF6B35] hover:bg-[#FF8C5A] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Voir les leads
        </Link>
      </div>

      {/* Bandeau upgrade Starter */}
      {isStarter && (
        <div className="rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] px-5 py-4 flex items-center justify-between gap-4 shadow-sm">
          <p className="text-sm font-semibold text-white leading-snug">
            🚀 Passez au plan Pro — 80 leads/mois, SMS, leads chauds IA et analytics avancés
          </p>
          <Link
            href="/settings/billing"
            className="shrink-0 bg-white text-[#FF6B35] text-xs font-bold px-4 py-2 rounded-xl hover:bg-orange-50 transition-colors whitespace-nowrap"
          >
            Voir le plan Pro →
          </Link>
        </div>
      )}

      {/* Alerte quota Starter */}
      {isStarter && leadsQuotaPercent >= 70 && (
        <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 ${leadsQuotaPercent >= 90 ? 'bg-red-50 border-red-200' : 'bg-[#fff4f0] border-[#FF6B35]-200'}`}>
          <div>
            <p className={`text-sm font-semibold ${leadsQuotaPercent >= 90 ? 'text-red-700' : 'text-[#FF6B35]-700'}`}>
              {leadsQuotaPercent >= 90 ? '🚨 Quota presque atteint' : '⚠️ Quota leads bientôt atteint'}
            </p>
            <p className={`text-xs mt-0.5 ${leadsQuotaPercent >= 90 ? 'text-red-600' : 'text-[#FF6B35]-600'}`}>
              {leadsQuotaUsed}/50 leads ce mois — passez en Pro pour des leads illimités
            </p>
          </div>
          <Link href="/settings/billing" className="shrink-0 bg-[#FF6B35] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#FF8C5A] transition-colors">
            Passer en Pro
          </Link>
        </div>
      )}

      {/* Alertes intelligentes */}
      <SmartAlerts />

      {/* Leads chauds — Pro/Agence */}
      {isProOrAgence && hotLeads && hotLeads.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              🔥 Leads chauds — à appeler en priorité
            </h2>
            <Link href="/leads" className="text-xs text-orange-600 hover:underline font-medium">
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
                  className="bg-white rounded-xl border border-orange-200 p-4 hover:border-orange-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-[#1B2B4B] truncate">{name}</p>
                    <span className="ml-2 shrink-0 text-xs font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                      {lead.ai_score}/10
                    </span>
                  </div>
                  {lead.phone && (
                    <p className="text-xs text-zinc-500 mb-1">📱 {lead.phone}</p>
                  )}
                  {budget && (
                    <p className="text-xs text-zinc-500">💰 {budget}</p>
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
          accent
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
            <h2 className="text-sm font-semibold text-[#1B2B4B]">Derniers leads</h2>
            <Link href="/leads" className="text-xs text-[#FF6B35] hover:underline font-medium">
              Voir tout →
            </Link>
          </div>
          {recentLeads && recentLeads.length > 0 ? (
            <div className="divide-y divide-zinc-50">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 bg-[#f0f3f9] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[#1B2B4B] text-xs font-semibold">
                      {lead.first_name[0]}{lead.last_name?.[0] ?? ''}
                    </span>
                  </div>
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 group-hover:text-[#1B2B4B] truncate">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{lead.email ?? 'Pas d\'email'}</p>
                  </div>
                  {/* Score IA */}
                  {lead.ai_score && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      lead.ai_score >= 7 ? 'bg-green-100 text-green-700' :
                      lead.ai_score >= 4 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {lead.ai_score}
                    </div>
                  )}
                  {/* Statut */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[lead.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                  {/* Date */}
                  <span className="text-xs text-zinc-300 hidden sm:block flex-shrink-0 w-16 text-right">
                    {formatRelativeTime(lead.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 bg-[#f0f3f9] rounded-2xl flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-[#1B2B4B]/40" />
              </div>
              <p className="text-sm font-medium text-zinc-600">Aucun lead pour l&apos;instant</p>
              <p className="text-xs text-zinc-400 mt-1">Ajoutez votre premier lead ou installez le widget sur votre site</p>
              <Link href="/leads" className="mt-4 text-xs text-[#FF6B35] font-medium hover:underline">
                Ajouter un lead →
              </Link>
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Actions rapides</h2>
            <div className="space-y-2">
              {[
                { href: '/leads', label: 'Ajouter un lead', icon: '➕', desc: 'Saisie manuelle' },
                { href: '/sequences', label: 'Créer une séquence', icon: '⚡', desc: 'Relances auto' },
                { href: '/settings/integrations', label: 'Installer le widget', icon: '🔧', desc: 'Capturer les leads du site' },
                { href: '/appointments', label: 'Voir les RDV', icon: '📅', desc: `${rdvWeek ?? 0} cette semaine` },
              ].map(({ href, label, icon, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0f3f9] transition-colors group"
                >
                  <span className="text-lg leading-none">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-700 group-hover:text-[#1B2B4B]">{label}</p>
                    <p className="text-xs text-zinc-400">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Activité récente */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Résumé du mois</h2>
            <div className="space-y-3">
              {[
                { label: 'Leads créés', value: leadsThisMonth ?? 0, icon: '👤' },
                { label: 'Leads gagnés', value: leadsGagnes ?? 0, icon: '🏆' },
                { label: 'Conversion', value: `${conversionRate}%`, icon: '📈' },
                ...(potentialCommission > 0 ? [{ label: 'Commission potentielle', value: fmtCurrency.format(potentialCommission), icon: '💰' }] : []),
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <span className="text-sm text-zinc-600">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#1B2B4B]">{value}</span>
                </div>
              ))}

              {/* Barre de quota si Starter */}
              {isStarter && (
                <div className="pt-2 border-t border-zinc-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-500">Quota leads</span>
                    <span className="text-xs font-medium text-zinc-700">{leadsQuotaUsed}/50</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${leadsQuotaPercent >= 90 ? 'bg-red-500' : leadsQuotaPercent >= 70 ? 'bg-[#FF6B35]' : 'bg-green-500'}`}
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
