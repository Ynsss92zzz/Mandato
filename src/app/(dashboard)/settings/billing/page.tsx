import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanId } from '@/constants/plans'
import { BillingActions } from '@/components/settings/billing-actions'
import { CheckoutButton } from '@/components/settings/checkout-button'
import { Check, X, AlertTriangle, Clock, Zap } from 'lucide-react'

export const metadata: Metadata = { title: 'Abonnement' }

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  trialing:   { label: 'Essai gratuit',  color: 'text-blue-700',   bg: 'bg-blue-50'   },
  active:     { label: 'Actif',          color: 'text-green-700',  bg: 'bg-green-50'  },
  past_due:   { label: 'Paiement en retard', color: 'text-red-700',   bg: 'bg-red-50'    },
  canceled:   { label: 'Annulé',         color: 'text-zinc-600',   bg: 'bg-zinc-100'  },
  incomplete: { label: 'Incomplet',      color: 'text-amber-700',  bg: 'bg-amber-50'  },
}

const PLAN_FEATURES: Record<PlanId, string[]> = {
  starter: [
    '50 leads / mois',
    '1 agent',
    'Qualification IA',
    'Emails automatiques',
    'Widget de capture',
    'Support email',
  ],
  pro: [
    'Leads illimités',
    '1 agent',
    'Qualification IA',
    'Emails + SMS + WhatsApp',
    'Widget de capture',
    'Séquences automatiques',
    'Support prioritaire',
  ],
  agence: [
    'Leads illimités',
    'Agents illimités',
    'Qualification IA',
    'Emails + SMS + WhatsApp',
    'Widget de capture',
    'Séquences automatiques',
    'Analytics avancés',
    'Rapports PDF hebdomadaires',
    'Gestion d\'équipe',
    'Support dédié',
  ],
}

// Features shown in comparison table
const COMPARISON_FEATURES = [
  { key: 'leads_per_month', label: 'Leads / mois', format: (v: number) => v === Infinity ? 'Illimités' : String(v) },
  { key: 'agents',          label: 'Agents',        format: (v: number) => v === Infinity ? 'Illimités' : String(v) },
  { key: 'sms',             label: 'SMS',           format: null },
  { key: 'whatsapp',        label: 'WhatsApp',      format: null },
  { key: 'multi_agents',    label: 'Multi-agents',  format: null },
  { key: 'advanced_analytics', label: 'Analytics avancés', format: null },
  { key: 'pdf_reports',     label: 'Rapports PDF',  format: null },
] as const

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysRemaining(iso: string | null) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; upgrade?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  const agencyId = member?.agency_id

  const [{ data: sub }, { data: agency }] = await Promise.all([
    agencyId
      ? supabase
          .from('subscriptions')
          .select('plan, status, trial_ends_at, current_period_end, leads_this_month, stripe_subscription_id')
          .eq('agency_id', agencyId)
          .single()
      : Promise.resolve({ data: null }),
    agencyId
      ? supabase
          .from('agencies')
          .select('stripe_customer_id')
          .eq('id', agencyId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const currentPlanId = (sub?.plan ?? 'starter') as PlanId
  const currentPlan = PLANS[currentPlanId]
  const statusCfg = STATUS_LABELS[sub?.status ?? 'trialing']
  const trialDays = sub?.status === 'trialing' ? daysRemaining(sub.trial_ends_at ?? null) : null
  const renewDate = sub?.current_period_end ?? null
  const leadsUsed = sub?.leads_this_month ?? 0
  const leadsMax = currentPlan.limits.leads_per_month
  const leadsPercent = leadsMax === Infinity ? 0 : Math.min(100, Math.round((leadsUsed / leadsMax) * 100))
  const hasStripeCustomer = !!agency?.stripe_customer_id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Abonnement &amp; facturation</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Gérez votre plan et vos informations de paiement</p>
      </div>

      {/* Toast feedback */}
      {params.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 flex-none" />
          Abonnement mis à jour avec succès. Merci !
        </div>
      )}
      {params.canceled && (
        <div className="bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
          <X className="w-4 h-4 flex-none" />
          Paiement annulé. Votre plan actuel est conservé.
        </div>
      )}
      {params.upgrade === 'agence' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 flex-none" />
          Cette fonctionnalité est réservée au plan Agence.
        </div>
      )}

      {/* Current plan summary */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-semibold text-zinc-800">Plan {currentPlan.name}</h2>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-zinc-400">{currentPlan.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-[#1B2B4B]">
              {currentPlan.price === 0 ? 'Gratuit' : `${currentPlan.price}€`}
            </p>
            {currentPlan.price > 0 && <p className="text-xs text-zinc-400">/ mois HT</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-zinc-100">
          {/* Trial / renewal */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#f0f3f9] rounded-lg flex items-center justify-center flex-none">
              <Clock className="w-4 h-4 text-[#1B2B4B]" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">
                {trialDays !== null ? 'Fin de l\'essai' : 'Prochain renouvellement'}
              </p>
              <p className="text-sm font-medium text-zinc-700">
                {trialDays !== null
                  ? `${trialDays} jour${trialDays !== 1 ? 's' : ''} restants`
                  : formatDate(renewDate)}
              </p>
            </div>
          </div>

          {/* Leads used */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#f0f3f9] rounded-lg flex items-center justify-center flex-none">
              <Zap className="w-4 h-4 text-[#1B2B4B]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400 mb-0.5">Leads ce mois</p>
              <p className="text-sm font-medium text-zinc-700">
                {leadsUsed}
                {leadsMax !== Infinity ? ` / ${leadsMax}` : ' (illimités)'}
              </p>
              {leadsMax !== Infinity && (
                <div className="mt-1.5 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${leadsPercent >= 90 ? 'bg-red-400' : leadsPercent >= 70 ? 'bg-amber-400' : 'bg-[#FF6B35]'}`}
                    style={{ width: `${leadsPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Manage */}
          <div className="flex items-center justify-end">
            <BillingActions
              currentPlanId={currentPlanId}
              hasStripeCustomer={hasStripeCustomer}
              hasActiveSubscription={!!sub?.stripe_subscription_id}
            />
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Changer de plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.values(PLANS) as typeof PLANS[PlanId][]).map((plan) => {
            const isCurrent = plan.id === currentPlanId
            const isUpgrade = plan.price > currentPlan.price
            const planFeatures = PLAN_FEATURES[plan.id]

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl border-2 p-5 flex flex-col transition-shadow
                  ${isCurrent
                    ? 'border-[#1B2B4B] shadow-md'
                    : plan.id === 'pro'
                    ? 'border-[#FF6B35]'
                    : 'border-zinc-200 hover:border-zinc-300'
                  }`}
              >
                {/* Badge */}
                {isCurrent && (
                  <span className="absolute -top-3 left-4 bg-[#1B2B4B] text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Plan actuel
                  </span>
                )}
                {plan.id === 'pro' && !isCurrent && (
                  <span className="absolute -top-3 left-4 bg-[#FF6B35] text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Populaire
                  </span>
                )}

                <div className="mb-4">
                  <h3 className="text-base font-bold text-zinc-800 mb-0.5">{plan.name}</h3>
                  <p className="text-xs text-zinc-400 mb-3">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#1B2B4B]">{plan.price}€</span>
                    <span className="text-sm text-zinc-400">/ mois</span>
                  </div>
                </div>

                <ul className="space-y-2 flex-1 mb-5">
                  {planFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                      <Check className="w-4 h-4 text-green-500 flex-none mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-zinc-100 text-zinc-400 cursor-default"
                  >
                    Plan actuel
                  </button>
                ) : (
                  <CheckoutButton
                    planId={plan.id}
                    label={isUpgrade ? `Passer à ${plan.name}` : `Revenir à ${plan.name}`}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center
                      ${isUpgrade
                        ? 'bg-[#FF6B35] hover:bg-[#FF8C5A] text-white'
                        : 'bg-[#1B2B4B] hover:bg-[#2D4270] text-white'
                      }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-800">Comparaison détaillée</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 w-2/5">Fonctionnalité</th>
                {Object.values(PLANS).map((p) => (
                  <th key={p.id} className={`text-center px-4 py-3 text-xs font-semibold ${p.id === currentPlanId ? 'text-[#1B2B4B]' : 'text-zinc-500'}`}>
                    {p.name}
                    {p.id === currentPlanId && <span className="ml-1 text-[10px] text-[#FF6B35]">●</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map(({ key, label, format }, i) => (
                <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                  <td className="px-5 py-3 text-zinc-600 font-medium">{label}</td>
                  {(Object.values(PLANS) as typeof PLANS[PlanId][]).map((p) => {
                    const val = p.limits[key as keyof typeof p.limits]
                    return (
                      <td key={p.id} className={`text-center px-4 py-3 ${p.id === currentPlanId ? 'font-semibold text-[#1B2B4B]' : 'text-zinc-500'}`}>
                        {format
                          ? format(val as number)
                          : val
                          ? <Check className="w-4 h-4 text-green-500 mx-auto" />
                          : <X className="w-4 h-4 text-zinc-300 mx-auto" />
                        }
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-[#f0f3f9] rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-[#1B2B4B] mb-1">Questions fréquentes</h2>
        {[
          {
            q: 'Puis-je changer de plan à tout moment ?',
            a: 'Oui, les changements de plan sont effectifs immédiatement. La différence de prix est calculée au prorata.',
          },
          {
            q: 'Comment annuler mon abonnement ?',
            a: 'Cliquez sur "Gérer mon abonnement" pour accéder au portail Stripe où vous pouvez annuler. Vous conservez l\'accès jusqu\'à la fin de la période.',
          },
          {
            q: 'L\'essai gratuit est-il sans engagement ?',
            a: 'Oui, 14 jours sans carte bancaire. Si vous ne souscrivez pas, votre compte passe automatiquement en lecture seule.',
          },
        ].map(({ q, a }) => (
          <details key={q} className="bg-white rounded-lg p-4 cursor-pointer group">
            <summary className="text-sm font-medium text-zinc-700 list-none flex items-center justify-between">
              {q}
              <span className="text-zinc-400 text-lg leading-none group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
