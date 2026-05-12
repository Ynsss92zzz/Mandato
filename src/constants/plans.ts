export type PlanId = 'starter' | 'pro' | 'agence'

export interface PlanLimits {
  leads_per_month: number
  agents: number
  sms: boolean
  multi_agents: boolean
  advanced_analytics: boolean
  pdf_reports: boolean
  hot_leads: boolean
  morning_briefing: boolean
  pre_visit_sheet: boolean
  priority_support: boolean
}

export interface Plan {
  id: PlanId
  name: string
  price: number
  description: string
  limits: PlanLimits
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 39,
    description: 'Pour démarrer et qualifier vos premiers leads',
    limits: {
      leads_per_month: 30,
      agents: 1,
      sms: false,
      multi_agents: false,
      advanced_analytics: false,
      pdf_reports: false,
      hot_leads: false,
      morning_briefing: false,
      pre_visit_sheet: false,
      priority_support: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 79,
    description: 'Automatisation complète pour l\'agent ambitieux',
    limits: {
      leads_per_month: 80,
      agents: 3,
      sms: true,
      multi_agents: false,
      advanced_analytics: true,
      pdf_reports: false,
      hot_leads: true,
      morning_briefing: true,
      pre_visit_sheet: true,
      priority_support: false,
    },
  },
  agence: {
    id: 'agence',
    name: 'Agence',
    price: 149,
    description: 'Pour les équipes et agences en pleine croissance',
    limits: {
      leads_per_month: Infinity,
      agents: Infinity,
      sms: true,
      multi_agents: true,
      advanced_analytics: true,
      pdf_reports: true,
      hot_leads: true,
      morning_briefing: true,
      pre_visit_sheet: true,
      priority_support: true,
    },
  },
}

export function getPlanById(id: string): Plan | null {
  return PLANS[id as PlanId] ?? null
}

export function canAccessFeature(planId: PlanId, feature: keyof PlanLimits): boolean {
  const plan = PLANS[planId]
  if (!plan) return false
  const value = plan.limits[feature]
  if (typeof value === 'boolean') return value
  return value > 0
}
