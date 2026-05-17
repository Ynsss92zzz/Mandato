import type { Metadata } from 'next'
import Link from 'next/link'
import { PLANS } from '@/constants/plans'

export const metadata: Metadata = {
  title: 'Mandato — L\'IA pour les agents immobiliers',
  description: 'Capturez, qualifiez et relancez vos leads automatiquement. Gagnez 10h par semaine et ne laissez plus aucun prospect sans réponse.',
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative bg-white overflow-hidden pt-16 pb-20 px-6">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f3f9] via-white to-[#FF6B35]/5 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto text-center">
        <span className="inline-flex items-center gap-2 bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
          Nouvelle fonctionnalité : Séquences de relances automatiques
        </span>

        <h1 className="text-5xl md:text-6xl font-bold text-[#1B2B4B] leading-tight tracking-tight mb-6">
          Ne perdez plus jamais
          <br />
          <span className="text-[#FF6B35]">un lead immobilier</span>
        </h1>

        <p className="text-xl text-zinc-500 leading-relaxed max-w-2xl mx-auto mb-10">
          Mandato capture, qualifie et relance vos prospects par email — automatiquement.
          Concentrez-vous sur la vente, l&apos;IA s&apos;occupe du reste.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link
            href="/register"
            className="px-8 py-4 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white font-semibold rounded-xl transition-colors text-base shadow-lg shadow-[#FF6B35]/20"
          >
            Démarrer gratuitement — 14 jours
          </Link>
          <Link
            href="#fonctionnalites"
            className="px-8 py-4 bg-[#f0f3f9] hover:bg-[#dce4f0] text-[#1B2B4B] font-semibold rounded-xl transition-colors text-base"
          >
            Voir comment ça marche →
          </Link>
        </div>

        <p className="text-xs text-zinc-400 mb-14">Sans carte bancaire · Annulation en 1 clic · Support 7j/7</p>

        {/* Dashboard mockup */}
        <div className="relative mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl shadow-[#1B2B4B]/10 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-zinc-50 border-b border-zinc-200">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-zinc-400 border border-zinc-200">
                app.mandato.fr/dashboard
              </div>
            </div>
            {/* Mockup content */}
            <div className="p-6 bg-[#f0f3f9]">
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Leads ce mois', value: '47', trend: '+23%', color: 'bg-white' },
                  { label: 'Taux de réponse', value: '89%', trend: '+12%', color: 'bg-white' },
                  { label: 'RDV planifiés', value: '12', trend: '+4', color: 'bg-white' },
                  { label: 'Score IA moyen', value: '7.4', trend: '↑', color: 'bg-white' },
                ].map((card) => (
                  <div key={card.label} className={`${card.color} rounded-xl p-4 border border-zinc-200`}>
                    <p className="text-xs text-zinc-400 mb-1">{card.label}</p>
                    <p className="text-2xl font-bold text-[#1B2B4B]">{card.value}</p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">{card.trend}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 bg-white rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-semibold text-[#1B2B4B] mb-3">Pipeline leads</p>
                  <div className="space-y-2">
                    {[
                      { name: 'Sophie Martin', status: 'qualifie', score: 8 },
                      { name: 'Jean Dupont', status: 'rdv_planifie', score: 9 },
                      { name: 'Marie Bernard', status: 'nouveau', score: 6 },
                    ].map((lead) => (
                      <div key={lead.name} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#1B2B4B] flex items-center justify-center">
                            <span className="text-xs text-white font-semibold">{lead.name[0]}</span>
                          </div>
                          <span className="text-xs font-medium text-[#1B2B4B]">{lead.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            Score {lead.score}/10
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs font-semibold text-[#1B2B4B] mb-3">IA active</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Email envoyé', time: 'il y a 2m', dot: 'bg-green-400' },
                      { label: 'Lead qualifié', time: 'il y a 5m', dot: 'bg-blue-400' },
                      { label: 'Email envoyé', time: 'il y a 8m', dot: 'bg-amber-400' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.dot} flex-none`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#1B2B4B]">{item.label}</p>
                          <p className="text-xs text-zinc-400">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg border border-zinc-100 px-4 py-3 flex items-center gap-2.5">
            <span className="text-xl">✦</span>
            <div>
              <p className="text-xs font-semibold text-[#1B2B4B]">IA en action</p>
              <p className="text-xs text-zinc-400">Lead qualifié en 30s</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Social proof ─────────────────────────────────────────────────────────────

function SocialProof() {
  return (
    <section className="bg-[#1B2B4B] py-10 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-sm text-white/50 mb-6 uppercase tracking-widest font-medium">
          Déjà adopté par plus de 150 agents immobiliers
        </p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center">
          {['Century 21', 'Orpi', 'Laforêt', 'IAD France', 'Guy Hoquet'].map((name) => (
            <p key={name} className="text-white/30 font-semibold text-sm md:text-base tracking-wide">
              {name}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🎯',
    title: 'Capture de leads intelligente',
    desc: 'Widget personnalisable à intégrer sur votre site en 5 minutes. Capture les coordonnées, le projet et le budget dès le premier contact.',
  },
  {
    icon: '✦',
    title: 'Qualification IA instantanée',
    desc: 'GPT-4o analyse chaque lead et lui attribue un score 1-10 avec profil, urgence et recommandation. Triez l\'essentiel en un coup d\'œil.',
  },
  {
    icon: '📧',
    title: 'Relances email automatiques',
    desc: 'Séquences d\'emails personnalisés déclenchées automatiquement selon le comportement du lead. Taux de réponse moyen : +67%.',
  },
  {
    icon: '📅',
    title: 'Prise de RDV automatique',
    desc: 'Intégration Cal.com native. Le lead choisit lui-même son créneau dans votre agenda — zéro aller-retour.',
  },
  {
    icon: '📊',
    title: 'Analytics & rapports PDF',
    desc: 'Tableaux de bord en temps réel + rapports hebdomadaires envoyés automatiquement. Pilotez votre activité avec précision.',
  },
]

function Features() {
  return (
    <section id="fonctionnalites" className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B2B4B] mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto">
            Une plateforme complète pensée pour les agents immobiliers — sans complexité.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-[#f0f3f9] rounded-2xl p-6 hover:shadow-md transition-shadow border border-transparent hover:border-zinc-200"
            >
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="text-base font-semibold text-[#1B2B4B] mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Installez le widget',
      desc: 'Copiez-collez une ligne de code sur votre site. Le widget capture les leads 24h/24 — même quand vous dormez.',
    },
    {
      num: '02',
      title: 'L\'IA qualifie et priorise',
      desc: 'Chaque lead reçoit un score IA, un profil acheteur et une recommandation d\'action. Sachez en 30s si le lead vaut votre temps.',
    },
    {
      num: '03',
      title: 'Les relances partent seules',
      desc: 'Vos séquences personnalisées s\'activent automatiquement. Le lead reçoit le bon message, au bon moment, sur le bon canal.',
    },
  ]

  return (
    <section className="py-20 px-6 bg-[#f0f3f9]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B2B4B] mb-4">
            Opérationnel en 10 minutes
          </h2>
          <p className="text-zinc-500 text-lg">Pas de formation, pas de configuration complexe.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-zinc-200 -translate-x-4 z-0" />
              )}
              <div className="relative z-10 bg-white rounded-2xl border border-zinc-200 p-6">
                <div className="w-12 h-12 bg-[#FF6B35] rounded-xl flex items-center justify-center mb-5">
                  <span className="text-white font-bold text-sm">{step.num}</span>
                </div>
                <h3 className="text-base font-semibold text-[#1B2B4B] mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
  const planFeatures: Record<string, string[]> = {
    starter: [
      '50 leads/mois',
      'Qualification IA',
      'Séquences email',
      'Widget embed',
      'Support email',
    ],
    pro: [
      'Leads illimités',
      'Qualification IA',
      'Relances email automatiques',
      'Widget embed avancé',
      'Prise de RDV Cal.com',
      'Support prioritaire',
    ],
    agence: [
      'Leads illimités',
      'Qualification IA',
      'Relances email automatiques',
      'Multi-agents (équipe)',
      'Analytics avancés',
      'Rapports PDF automatiques',
      'Intégration CRM',
      'Support dédié',
    ],
  }

  return (
    <section id="tarifs" className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B2B4B] mb-4">
            Des tarifs clairs, sans surprise
          </h2>
          <p className="text-zinc-500 text-lg">14 jours d&apos;essai gratuit sur tous les plans</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(PLANS).map((plan) => {
            const isPro = plan.id === 'pro'
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-8 flex flex-col ${
                  isPro
                    ? 'border-[#FF6B35] bg-[#1B2B4B] text-white shadow-xl shadow-[#1B2B4B]/20 relative'
                    : 'border-zinc-200 bg-white'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#FF6B35] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Le plus populaire
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className={`text-lg font-bold mb-1 ${isPro ? 'text-white' : 'text-[#1B2B4B]'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${isPro ? 'text-white/60' : 'text-zinc-400'}`}>
                    {plan.description}
                  </p>
                </div>
                <div className="mb-8">
                  <span className={`text-4xl font-bold ${isPro ? 'text-white' : 'text-[#1B2B4B]'}`}>
                    {plan.price}€
                  </span>
                  <span className={`text-sm ml-1 ${isPro ? 'text-white/50' : 'text-zinc-400'}`}>/mois</span>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {(planFeatures[plan.id] ?? []).map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <svg className={`w-4 h-4 flex-none mt-0.5 ${isPro ? 'text-[#FF6B35]' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={isPro ? 'text-white/80' : 'text-zinc-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={`text-center py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                    isPro
                      ? 'bg-[#FF6B35] hover:bg-[#FF8C5A] text-white'
                      : 'bg-[#f0f3f9] hover:bg-[#1B2B4B] text-[#1B2B4B] hover:text-white'
                  }`}
                >
                  Démarrer l&apos;essai gratuit
                </Link>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-zinc-400 mt-8">
          Besoin d&apos;une offre sur-mesure ?{' '}
          <a href="mailto:hello@mandato.fr" className="text-[#1B2B4B] font-medium hover:underline">
            Contactez-nous
          </a>
        </p>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: 'Claire Fontaine',
    role: 'Agent indépendante — Lyon',
    avatar: 'CF',
    quote: 'Avant Mandato, je perdais facilement 3h par jour à relancer des leads. Maintenant l\'IA le fait pour moi et mes rendez-vous ont augmenté de 40% en 2 mois.',
    stars: 5,
  },
  {
    name: 'Isabelle Renard',
    role: 'Équipe de 5 agents — Paris',
    avatar: 'IR',
    quote: 'Le plan Agence nous permet de gérer l\'équipe entière depuis un seul endroit. Le dashboard analytics est bluffant de clarté.',
    stars: 5,
  },
]

function Testimonials() {
  return (
    <section className="py-20 px-6 bg-[#f0f3f9]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B2B4B] mb-4">
            Ils ont transformé leur activité
          </h2>
          <p className="text-zinc-500 text-lg">Des vrais résultats, mesurables dès le 1er mois</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col">
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed flex-1 mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1B2B4B] flex items-center justify-center flex-none">
                  <span className="text-xs font-semibold text-white">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1B2B4B]">{t.name}</p>
                  <p className="text-xs text-zinc-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Dois-je avoir des compétences techniques pour installer Mandato ?',
    a: 'Non. L\'installation du widget se fait en copiant-collant une seule ligne de code sur votre site. Si vous utilisez WordPress, Wix ou Squarespace, nous avons des tutoriels dédiés. L\'onboarding guidé vous accompagne étape par étape.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Vos données sont hébergées en Europe (Supabase EU), chiffrées en transit et au repos. Chaque agence dispose d\'un espace complètement isolé. Nous sommes conformes RGPD.',
  },
  {
    q: 'Puis-je tester avant de payer ?',
    a: '14 jours d\'essai gratuit sur tous les plans, sans carte bancaire. Après l\'essai, vous choisissez votre plan ou vous annulez en 1 clic.',
  },
  {
    q: 'Quels canaux de messagerie sont supportés ?',
    a: 'Email via Resend. Les séquences de relances email sont disponibles sur tous les plans. D\'autres canaux seront ajoutés prochainement.',
  },
  {
    q: 'Comment fonctionne le programme de parrainage ?',
    a: 'Chaque client reçoit un lien de parrainage unique. Pour chaque filleul qui s\'abonne, vous gagnez 1 mois offert sur votre abonnement. Votre filleul bénéficie d\'une période d\'essai étendue à 30 jours.',
  },
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui, à tout moment depuis votre espace. La mise à niveau est instantanée. Le downgrade prend effet à la fin de la période en cours.',
  },
]

function FAQ() {
  return (
    <section id="faq" className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B2B4B] mb-4">
            Questions fréquentes
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group bg-[#f0f3f9] rounded-xl border border-zinc-200 overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none select-none">
                <span className="text-sm font-semibold text-[#1B2B4B]">{item.q}</span>
                <svg
                  className="w-5 h-5 text-zinc-400 flex-none transition-transform group-open:rotate-180"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-5 pt-1">
                <p className="text-sm text-zinc-500 leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Final ────────────────────────────────────────────────────────────────

function CTAFinal() {
  return (
    <section className="py-20 px-6 bg-[#1B2B4B]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Prêt à automatiser votre prospection ?
        </h2>
        <p className="text-white/60 text-lg mb-10">
          Rejoignez 150+ agents immobiliers qui gagnent 10h par semaine avec Mandato.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white font-semibold rounded-xl transition-colors text-base"
          >
            Démarrer gratuitement — 14 jours
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors text-base"
          >
            Voir les tarifs
          </Link>
        </div>
        <p className="text-white/30 text-xs mt-6">Sans carte bancaire · Annulation en 1 clic</p>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTAFinal />
    </>
  )
}
