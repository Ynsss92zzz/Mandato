import type { PlanId } from '@/constants/plans'

export type LeadStatus = 'nouveau' | 'contacte' | 'qualifie' | 'rdv_planifie' | 'proposition' | 'gagne' | 'perdu'

export type ProjectType = 'achat' | 'vente' | 'location'

export type LeadSource = 'widget' | 'manuel' | 'seloger' | 'leboncoin' | 'logicimmo' | 'import' | 'autre'

export type MessageChannel = 'email' | 'sms' | 'whatsapp' | 'note'

export type AgencyMemberRole = 'owner' | 'agent'

export type SequenceStatus = 'actif' | 'pause' | 'archive'

export type EnrollmentStatus = 'actif' | 'termine' | 'stoppe'

export interface LeadAIAnalysis {
  score: number
  intention: 'achat' | 'location' | 'vente' | 'estimation' | 'inconnu'
  budget_estime: string | null
  urgence: '1_mois' | '3_mois' | '6_mois' | 'plus_6_mois' | 'inconnu'
  profil: string
  recommandation: string
}

export interface SubscriptionStatus {
  plan: PlanId
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  trial_ends_at: string | null
  current_period_end: string | null
  leads_this_month: number
}
