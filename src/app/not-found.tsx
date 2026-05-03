import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-50 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-8xl font-bold text-navy/10 mb-2 leading-none">404</p>
        <h1 className="text-2xl font-semibold text-navy mb-3">Page introuvable</h1>
        <p className="text-zinc-500 text-sm mb-8 max-w-xs">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
          >
            Retour au tableau de bord
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 bg-zinc-100 text-zinc-600 text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Page d&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
