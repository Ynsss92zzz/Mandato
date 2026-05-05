'use client'

import { useState, useTransition } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { startCheckout } from '@/actions/billing'

interface Props {
  planId: string
  label: string
  className: string
}

export function CheckoutButton({ planId, label, className }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await startCheckout(planId)
      if (result && 'error' in result) {
        setError(result.error)
      }
      // Si pas d'erreur, startCheckout a redirigé — rien à faire
    })
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-none mt-0.5" />
          <p className="text-xs text-red-600 leading-snug">{error}</p>
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={className}
      >
        {pending
          ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />Redirection…</>
          : label
        }
      </button>
    </div>
  )
}
