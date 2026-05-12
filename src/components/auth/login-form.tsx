'use client'

import { useActionState } from 'react'
import { login, loginWithGoogle } from '@/actions/auth'
import type { AuthState } from '@/actions/auth'

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-500 text-xs mt-1">{messages[0]}</p>
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(login, null)

  return (
    <div className="space-y-4">
      {/* Google OAuth */}
      <form action={loginWithGoogle}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 border border-zinc-200 rounded-xl py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <GoogleIcon />
          Continuer avec Google
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-100" />
        <span className="text-xs text-zinc-400">ou</span>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>

      {/* Email / password */}
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Email
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
          <FieldError messages={state?.errors?.email} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Mot de passe
            </label>
            <a href="/forgot-password" className="text-xs text-[#FF6B35] hover:underline">
              Oublié ?
            </a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B] transition"
          />
          <FieldError messages={state?.errors?.password} />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="remember_me"
            name="remember_me"
            type="checkbox"
            className="w-4 h-4 rounded border-zinc-300 text-[#1B2B4B] accent-[#1B2B4B]"
          />
          <label htmlFor="remember_me" className="text-sm text-zinc-600 select-none">
            Se souvenir de moi
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#1B2B4B] hover:bg-[#2D4270] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          {isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
