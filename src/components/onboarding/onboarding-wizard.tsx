'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, applyReferralCode } from '@/actions/referral'

interface Step {
  id: number
  title: string
  subtitle: string
}

const STEPS: Step[] = [
  { id: 1, title: 'Bienvenue sur Mandato', subtitle: 'Configurons votre espace en 2 minutes' },
  { id: 2, title: 'Installez votre widget', subtitle: 'Capturez des leads directement depuis votre site' },
  { id: 3, title: 'Vos canaux de contact', subtitle: 'Choisissez comment relancer vos prospects' },
  { id: 4, title: 'Code de parrainage', subtitle: 'Bénéficiez de 30 jours d\'essai supplémentaires' },
]

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 === current
              ? 'w-8 bg-[#FF6B35]'
              : i + 1 < current
                ? 'w-4 bg-[#FF6B35]/40'
                : 'w-4 bg-zinc-200'
          }`}
        />
      ))}
    </div>
  )
}

function Step1Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-2xl font-bold text-[#1B2B4B] mb-3">Votre compte est prêt !</h2>
      <p className="text-zinc-500 leading-relaxed mb-8 max-w-sm mx-auto">
        En quelques étapes, nous allons configurer votre espace Mandato pour que vous puissiez capturer et qualifier vos premiers leads dès aujourd&apos;hui.
      </p>
      <div className="grid grid-cols-3 gap-4 mb-8 text-center">
        {[
          { icon: '⚡', label: '30 secondes', sub: 'pour qualifier un lead' },
          { icon: '📈', label: '+67%', sub: 'de taux de réponse' },
          { icon: '⏰', label: '10h/semaine', sub: 'économisées en moyenne' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#f0f3f9] rounded-xl p-4">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <p className="text-sm font-bold text-[#1B2B4B]">{stat.label}</p>
            <p className="text-xs text-zinc-400">{stat.sub}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="w-full py-3.5 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white font-semibold rounded-xl transition-colors"
      >
        Commencer la configuration →
      </button>
    </div>
  )
}

function Step2Widget({ onNext }: { onNext: () => void }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'
  const snippet = `<script src="${appUrl}/widget.js" async></script>`

  return (
    <div>
      <div className="flex items-center justify-center w-14 h-14 bg-[#FF6B35]/10 rounded-2xl mb-6 mx-auto">
        <span className="text-2xl">🎯</span>
      </div>
      <h2 className="text-xl font-bold text-[#1B2B4B] mb-2 text-center">Widget de capture</h2>
      <p className="text-sm text-zinc-500 text-center mb-6 leading-relaxed">
        Collez ce code avant la balise <code className="bg-zinc-100 px-1 rounded text-xs">&lt;/body&gt;</code> de votre site pour commencer à capturer des leads.
      </p>

      <div className="bg-[#1B2B4B] rounded-xl p-4 mb-4 relative">
        <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap break-all">
          {snippet}
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(snippet)}
          className="absolute top-3 right-3 text-xs text-white/50 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
        >
          Copier
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
        <p className="text-xs text-blue-700">
          💡 Vous utilisez WordPress, Wix ou Shopify ?{' '}
          <a href="/settings/integrations" className="font-semibold underline">
            Voir les guides d&apos;installation
          </a>
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 py-3 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white font-semibold rounded-xl transition-colors text-sm"
        >
          C&apos;est installé →
        </button>
        <button
          onClick={onNext}
          className="px-4 py-3 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}

function Step3Channels({ onNext }: { onNext: () => void }) {
  const channels = [
    { id: 'email', icon: '✉️', label: 'Email', desc: 'Inclus dans tous les plans', always: true },
    { id: 'sms', icon: '💬', label: 'SMS', desc: 'Plan Pro et Agence', always: false },
    { id: 'whatsapp', icon: '📱', label: 'WhatsApp', desc: 'Taux d\'ouverture 98%', always: false },
  ]

  return (
    <div>
      <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-2xl mb-6 mx-auto">
        <span className="text-2xl">📲</span>
      </div>
      <h2 className="text-xl font-bold text-[#1B2B4B] mb-2 text-center">Canaux de communication</h2>
      <p className="text-sm text-zinc-500 text-center mb-6">
        Mandato peut relancer vos leads via plusieurs canaux simultanément.
      </p>

      <div className="space-y-3 mb-6">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className={`flex items-center gap-4 p-4 rounded-xl border ${
              ch.always
                ? 'border-green-200 bg-green-50'
                : 'border-zinc-200 bg-zinc-50'
            }`}
          >
            <span className="text-2xl">{ch.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1B2B4B]">{ch.label}</p>
              <p className="text-xs text-zinc-400">{ch.desc}</p>
            </div>
            {ch.always ? (
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Activé
              </span>
            ) : (
              <a
                href="/settings/billing"
                className="text-xs font-medium text-[#FF6B35] hover:underline"
              >
                Upgrader →
              </a>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white font-semibold rounded-xl transition-colors"
      >
        Continuer →
      </button>
    </div>
  )
}

function Step4Referral({
  initialCode,
  onComplete,
}: {
  initialCode: string
  onComplete: () => void
}) {
  const [code, setCode] = useState(initialCode)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [applied, setApplied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleApply() {
    if (!code.trim()) return
    startTransition(async () => {
      const result = await applyReferralCode(code)
      if (result.error) {
        setMessage(result.error)
        setIsError(true)
      } else {
        setMessage(result.message ?? 'Code appliqué !')
        setIsError(false)
        setApplied(true)
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-6 mx-auto">
        <span className="text-2xl">🎁</span>
      </div>
      <h2 className="text-xl font-bold text-[#1B2B4B] mb-2 text-center">Code de parrainage</h2>
      <p className="text-sm text-zinc-500 text-center mb-6 leading-relaxed">
        Si un agent vous a recommandé Mandato, entrez son code pour profiter de 30 jours d&apos;essai au lieu de 14.
      </p>

      {!applied ? (
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: ABCD1234"
              maxLength={8}
              className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-mono text-[#1B2B4B] uppercase placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 tracking-widest"
            />
            <button
              onClick={handleApply}
              disabled={isPending || !code.trim()}
              className="px-5 py-3 bg-[#1B2B4B] text-white text-sm font-semibold rounded-xl hover:bg-[#2D4270] transition-colors disabled:opacity-50"
            >
              {isPending ? '...' : 'Appliquer'}
            </button>
          </div>
          {message && (
            <p className={`text-xs mt-2 ${isError ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-4 mb-6 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <p className="text-sm font-semibold text-green-800">{message}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onComplete}
          className="flex-1 py-3.5 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white font-semibold rounded-xl transition-colors"
        >
          Accéder à mon espace →
        </button>
        {!applied && (
          <button
            onClick={onComplete}
            className="px-4 py-3 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Passer
          </button>
        )}
      </div>
    </div>
  )
}

interface OnboardingWizardProps {
  initialReferralCode?: string
}

export function OnboardingWizard({ initialReferralCode = '' }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isCompleting, startComplete] = useTransition()

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  function handleComplete() {
    startComplete(async () => {
      await completeOnboarding()
      router.push('/dashboard')
    })
  }

  const currentStep = STEPS[step - 1]

  return (
    <div className="min-h-screen bg-[#f0f3f9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-[#1B2B4B]">Mandato</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
          {/* Progress */}
          <div className="flex items-center justify-between mb-6">
            <StepIndicator current={step} total={STEPS.length} />
            <span className="text-xs text-zinc-400">{step}/{STEPS.length}</span>
          </div>

          {/* Step label */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-1">
              {currentStep.title}
            </p>
            <p className="text-xs text-zinc-400">{currentStep.subtitle}</p>
          </div>

          {/* Step content */}
          {step === 1 && <Step1Welcome onNext={next} />}
          {step === 2 && <Step2Widget onNext={next} />}
          {step === 3 && <Step3Channels onNext={next} />}
          {step === 4 && (
            <Step4Referral
              initialCode={initialReferralCode}
              onComplete={isCompleting ? () => {} : handleComplete}
            />
          )}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Besoin d&apos;aide ?{' '}
          <a href="mailto:support@mandato.fr" className="text-[#1B2B4B] font-medium hover:underline">
            Contactez le support
          </a>
        </p>
      </div>
    </div>
  )
}
