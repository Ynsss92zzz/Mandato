'use client'

import { useSubscription } from '@/hooks/use-subscription'
import type { PlanLimits } from '@/constants/plans'

interface PlanGateProps {
  feature: keyof PlanLimits
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PlanGate({ feature, children, fallback }: PlanGateProps) {
  const { can, loading } = useSubscription()

  if (loading) return null
  if (!can(feature)) {
    return fallback ? <>{fallback}</> : null
  }
  return <>{children}</>
}
