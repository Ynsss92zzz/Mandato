'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanId, type PlanLimits } from '@/constants/plans'

interface SubscriptionState {
  plan: PlanId
  status: string
  loading: boolean
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    plan: 'starter',
    status: 'trialing',
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    async function fetchSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .single()

      if (data) {
        setState({ plan: data.plan as PlanId, status: data.status, loading: false })
      } else {
        setState((s) => ({ ...s, loading: false }))
      }
    }

    fetchSubscription()
  }, [])

  const limits = PLANS[state.plan]?.limits as PlanLimits

  function can(feature: keyof PlanLimits): boolean {
    if (!limits) return false
    const value = limits[feature]
    if (typeof value === 'boolean') return value
    return (value as number) > 0
  }

  return { ...state, limits, can }
}
