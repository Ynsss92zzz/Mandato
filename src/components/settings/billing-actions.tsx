'use client'

import { useTransition } from 'react'
import { openBillingPortal } from '@/actions/billing'
import { CreditCard, Loader2, XCircle } from 'lucide-react'
import type { PlanId } from '@/constants/plans'

interface Props {
  currentPlanId: PlanId
  hasStripeCustomer: boolean
  hasActiveSubscription: boolean
}

export function BillingActions({ hasStripeCustomer, hasActiveSubscription }: Props) {
  const [isPending, startTransition] = useTransition()

  if (!hasStripeCustomer || !hasActiveSubscription) return null

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => startTransition(() => openBillingPortal())}
        disabled={isPending}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#1B2B4B] hover:text-[#2D4270] border border-zinc-200 hover:border-zinc-300 bg-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        Gérer mon abonnement
      </button>
      <button
        onClick={() => startTransition(() => openBillingPortal())}
        disabled={isPending}
        className="inline-flex items-center gap-2 text-xs font-medium text-red-500 hover:text-red-600 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
        Résilier mon abonnement
      </button>
    </div>
  )
}
