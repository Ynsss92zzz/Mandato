'use client'

import { useActionState } from 'react'
import { signup } from '@/actions/auth'
import type { AuthState } from '@/actions/auth'

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-500 text-xs mt-1">{messages[0]}</p>
}

export function RegisterForm({ referralCode = '' }: { referralCode?: string }) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(signup, null)

  if (state?.success) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">📬</div>
        <h3 className="font-semibold text-green-800 mb-1">Email envoyé !</h3>
        <p className="text-green-700 text-sm">{state.success}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {referralCode && (
        <input type="hidden" name="referral_code" value={referralCode} />
      )}
      {state?.error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Votre nom complet
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          placeholder="Jean Dupont"
          className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
        />
        <FieldError messages={state?.errors?.full_name} />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Email professionnel
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@agence.fr"
          className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
        />
        <FieldError messages={state?.errors?.email} />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="8 caractères min, 1 majuscule, 1 chiffre"
          className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
        />
        <FieldError messages={state?.errors?.password} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-orange hover:bg-orange-light disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        {isPending ? 'Création du compte…' : 'Démarrer l\'essai gratuit'}
      </button>

      <p className="text-xs text-zinc-400 text-center">
        En créant un compte vous acceptez nos{' '}
        <a href="/cgu" className="underline hover:text-zinc-600">CGU</a>
        {' '}et notre{' '}
        <a href="/confidentialite" className="underline hover:text-zinc-600">politique de confidentialité</a>.
      </p>
    </form>
  )
}
