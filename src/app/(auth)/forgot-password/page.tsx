import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = { title: 'Mot de passe oublié' }

export default function ForgotPasswordPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
      <h1 className="text-2xl font-semibold text-[#1B2B4B] mb-1">Mot de passe oublié</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Saisissez votre email pour recevoir un lien de réinitialisation
      </p>
      <ForgotPasswordForm />
      <p className="text-zinc-400 text-center text-sm mt-6">
        <Link href="/login" className="text-[#FF6B35] font-medium hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
