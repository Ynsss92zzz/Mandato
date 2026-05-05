'use client'

import { useTransition } from 'react'
import { openBillingPortal } from '@/actions/billing'
import { CreditCard, Loader2 } from 'lucide-react'
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
    <button
      onClick={() => startTransition(() => openBillingPortal())}
      disabled={isPending}
      className="inline-flex items-center gap-2 text-sm font-medium text-[#1B2B4B] hover:text-[#2D4270] border border-zinc-200 hover:border-zinc-300 bg-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <CreditCard className="w-4 h-4" />
      )}
      Gérer mon abonnement
    </button>
  )
}
