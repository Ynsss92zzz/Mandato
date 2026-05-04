'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error monitoring service (ex: Sentry) if configured
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#f0f3f9] flex items-center justify-center px-6 font-sans antialiased">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1B2B4B] mb-2">Une erreur est survenue</h1>
          <p className="text-zinc-500 text-sm mb-6 max-w-xs">
            Quelque chose s&apos;est mal passé. L&apos;équipe a été notifiée.
            {error.digest && (
              <span className="block mt-1 text-xs text-zinc-400">Réf : {error.digest}</span>
            )}
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#1B2B4B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D4270] transition-colors"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
