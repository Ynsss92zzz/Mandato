import type { Metadata } from 'next'
import Link from 'next/link'
import { PLANS } from '@/constants/plans'

export const metadata: Metadata = { title: 'Tarifs' }

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f0f3f9] py-24 px-6">
      <div className="max-w-5xl mx-auto text-center mb-16">
        <h1 className="text-4xl font-bold text-[#1B2B4B] mb-4">Tarifs simples et transparents</h1>
        <p className="text-zinc-500 text-lg">14 jours d&apos;essai gratuit — sans carte bancaire</p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.values(PLANS).map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border p-8 flex flex-col ${
              plan.id === 'pro' ? 'border-[#FF6B35] shadow-lg ring-2 ring-[#FF6B35]/20' : 'border-zinc-200'
            }`}
          >
            {plan.id === 'pro' && (
              <span className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-4">
                Le plus populaire
              </span>
            )}
            <h2 className="text-2xl font-bold text-[#1B2B4B]">{plan.name}</h2>
            <p className="text-zinc-500 text-sm mt-1 mb-6">{plan.description}</p>
            <div className="mb-8">
              <span className="text-4xl font-bold text-[#1B2B4B]">{plan.price}€</span>
              <span className="text-zinc-400 text-sm">/mois</span>
            </div>
            <ul className="space-y-3 text-sm text-zinc-600 flex-1">
              <li>✓ {plan.limits.leads_per_month === Infinity ? 'Leads illimités' : `${plan.limits.leads_per_month} leads/mois`}</li>
              <li>✓ Qualification IA automatique</li>
              <li>✓ Relances email automatiques</li>
              {plan.limits.sms && <li>✓ Relances SMS</li>}
              {plan.limits.whatsapp && <li>✓ Relances WhatsApp</li>}
              {plan.limits.multi_agents && <li>✓ Multi-agents (équipe)</li>}
              {plan.limits.advanced_analytics && <li>✓ Analytics avancés</li>}
              {plan.limits.pdf_reports && <li>✓ Rapports PDF hebdomadaires</li>}
            </ul>
            <Link
              href={`/register?plan=${plan.id}`}
              className={`mt-8 text-center py-3 rounded-xl font-semibold transition-colors ${
                plan.id === 'pro'
                  ? 'bg-[#FF6B35] hover:bg-[#FF8C5A] text-white'
                  : 'bg-[#f0f3f9] hover:bg-[#dce4f0] text-[#1B2B4B]'
              }`}
            >
              Commencer l&apos;essai gratuit
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}
