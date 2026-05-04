'use client'

import { useActionState } from 'react'
import { forgotPassword } from '@/actions/auth'
import type { AuthState } from '@/actions/auth'

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(forgotPassword, null)

  if (state?.success) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">✉️</div>
        <h3 className="font-semibold text-green-800 mb-1">Lien envoyé !</h3>
        <p className="text-green-700 text-sm">{state.success}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Votre email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@agence.fr"
          className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B] transition"
        />
        {state?.errors?.email && (
          <p className="text-red-500 text-xs mt-1">{state.errors.email[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[#1B2B4B] hover:bg-[#2D4270] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        {isPending ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
      </button>
    </form>
  )
}
