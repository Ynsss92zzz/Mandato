'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type AuthState = {
  error?: string
  success?: string
  errors?: Record<string, string[]>
} | null

// ─── Schémas Zod ───────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(1, { message: 'Mot de passe requis' }),
})

const RegisterSchema = z.object({
  full_name: z.string().min(2, { message: 'Nom trop court (2 caractères min)' }).trim(),
  email: z.string().email({ message: 'Email invalide' }).trim(),
  password: z
    .string()
    .min(8, { message: '8 caractères minimum' })
    .regex(/[A-Z]/, { message: 'Au moins une majuscule' })
    .regex(/[0-9]/, { message: 'Au moins un chiffre' }),
  referral_code: z.string().optional(),
})

const ForgotSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
})

// Known disposable email domains — basic abuse prevention
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'temp-mail.org', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'trashmail.com', 'trashmail.me', 'tempmail.com',
  'fakeinbox.com', 'maildrop.cc', 'dispostable.com', 'spamgourmet.com',
  'getairmail.com', 'filzmail.com', 'DropMail.me', 'mohmal.com',
  'tempr.email', 'discard.email', 'mailnull.com', 'spamspot.com',
])

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false
}

// ─── Cookie helpers ─────────────────────────────────────────────────────────

const COOKIE_OPTS_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

async function setRememberMeCookie(remember: boolean) {
  const cookieStore = await cookies()
  cookieStore.set('mandato_rm', '1', {
    ...COOKIE_OPTS_BASE,
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}), // 30 days or session cookie
  })
}

async function clearRememberMeCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('mandato_rm')
}

async function setTrialUsedCookie() {
  const cookieStore = await cookies()
  cookieStore.set('mandato_trial_used', '1', {
    ...COOKIE_OPTS_BASE,
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: 'Email ou mot de passe incorrect' }
  }

  const rememberMe = formData.get('remember_me') === 'on'
  await setRememberMeCookie(rememberMe)

  redirect('/dashboard')
}

export async function signup(state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = RegisterSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    referral_code: formData.get('referral_code') ?? undefined,
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  // Block disposable emails
  if (isDisposableEmail(parsed.data.email)) {
    return { error: 'Les adresses email temporaires ne sont pas acceptées.' }
  }

  // Block multiple trials from the same device
  const cookieStore = await cookies()
  if (cookieStore.has('mandato_trial_used')) {
    return { error: 'Un essai gratuit a déjà été utilisé depuis cet appareil.' }
  }

  try {
    const supabase = await createClient()

    console.log('[signup] attempt', {
      email: parsed.data.email,
      has_referral: !!parsed.data.referral_code,
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(missing)',
    })

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.full_name,
          referral_code: parsed.data.referral_code ?? null,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    })

    if (error) {
      console.error('[signup] supabase error', {
        message: error.message,
        status: error.status,
        code: (error as unknown as Record<string, unknown>).code ?? null,
        name: error.name,
      })

      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return { error: 'Cet email est déjà utilisé.' }
      }
      return { error: `Erreur Supabase (${error.status ?? '?'}): ${error.message}` }
    }

    console.log('[signup] success', {
      user_id: data.user?.id ?? null,
      email_confirmed: data.user?.email_confirmed_at ?? null,
      session: data.session ? 'present' : 'null',
    })

    // Mark this device as having used a trial
    await setTrialUsedCookie()

    return { success: 'Vérifiez votre email pour activer votre compte.' }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[signup] unexpected exception', {
      message,
      stack: err instanceof Error ? err.stack : null,
    })
    return { error: `Erreur inattendue: ${message}` }
  }
}

export async function forgotPassword(state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = ForgotSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) return { error: error.message }

  return { success: 'Lien envoyé — vérifiez votre boîte mail.' }
}

export async function loginWithGoogle(): Promise<never> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error || !data.url) redirect('/login?error=google_failed')
  redirect(data.url)
}

export async function logout(): Promise<never> {
  await clearRememberMeCookie()
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
