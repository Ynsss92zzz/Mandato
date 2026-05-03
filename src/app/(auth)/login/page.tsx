import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Connexion' }

export default function LoginPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
      <h1 className="text-2xl font-semibold text-navy mb-1">Connexion</h1>
      <p className="text-zinc-500 text-sm mb-6">Accédez à votre espace Mandato</p>
      <LoginForm />
      <p className="text-zinc-400 text-center text-sm mt-6">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-orange font-medium hover:underline">
          Essai gratuit 14 jours
        </Link>
      </p>
    </div>
  )
}
