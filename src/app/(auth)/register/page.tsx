import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Créer un compte' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; plan?: string }>
}) {
  const { ref } = await searchParams
  const hasRef = Boolean(ref)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-navy mb-1">Créer votre compte</h1>
        <p className="text-zinc-500 text-sm">
          {hasRef ? 'Essai gratuit 30 jours — code de parrainage appliqué 🎁' : 'Essai gratuit 14 jours — sans carte bancaire'}
        </p>
      </div>

      {/* Badges de réassurance */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          hasRef ? '✓ 30 jours offerts' : '✓ 14 jours offerts',
          '✓ Sans engagement',
          '✓ Annulation en 1 clic',
        ].map((t) => (
          <span key={t} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
            {t}
          </span>
        ))}
      </div>

      <RegisterForm referralCode={ref ?? ''} />

      <p className="text-zinc-400 text-center text-sm mt-6">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-orange font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
