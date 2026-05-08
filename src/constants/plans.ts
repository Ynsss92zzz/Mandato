export type PlanId = 'starter' | 'pro' | 'agence'

export interface PlanLimits {
  leads_per_month: number
  agents: number
  whatsapp: boolean
  sms: boolean
  multi_agents: boolean
  advanced_analytics: boolean
  pdf_reports: boolean
  unlimited_templates: boolean
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
      leads_per_month: 50,
      agents: 1,
      whatsapp: false,
      sms: false,
      multi_agents: false,
      advanced_analytics: false,
      pdf_reports: false,
      unlimited_templates: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 79,
    description: 'Automatisation complète multi-canal',
    limits: {
      leads_per_month: Infinity,
      agents: 1,
      whatsapp: true,
      sms: true,
      multi_agents: false,
      advanced_analytics: false,
      pdf_reports: false,
      unlimited_templates: true,
    },
  },
  agence: {
    id: 'agence',
    name: 'Agence',
    price: 149,
    description: 'Pour les équipes avec analytics avancés',
    limits: {
      leads_per_month: Infinity,
      agents: Infinity,
      whatsapp: true,
      sms: true,
      multi_agents: true,
      advanced_analytics: true,
      pdf_reports: true,
      unlimited_templates: true,
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
