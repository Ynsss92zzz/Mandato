'use server'

import { redirect } from 'next/navigation'
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
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
