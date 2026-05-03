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

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
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
    if (error.message.includes('already registered')) {
      return { error: 'Cet email est déjà utilisé.' }
    }
    return { error: error.message }
  }

  return { success: 'Vérifiez votre email pour activer votre compte.' }
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
