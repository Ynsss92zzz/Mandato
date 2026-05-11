'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { qualifyLead } from '@/lib/ai/qualify-lead'
import { autoEnrollNewLead } from '@/lib/sequences/auto-enroll'
import type { LeadStatus, LeadSource } from '@/types'

async function getAgencyId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', userId)
    .single()
  return data?.agency_id ?? null
}

export async function createLead(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const budgetRaw = formData.get('budget') as string | null
  const budget = budgetRaw ? parseInt(budgetRaw, 10) || null : null

  const { data, error } = await supabase
    .from('leads')
    .insert({
      agency_id: agencyId,
      first_name: formData.get('first_name') as string,
      last_name: (formData.get('last_name') as string | null) || null,
      email: (formData.get('email') as string | null) || null,
      phone: (formData.get('phone') as string | null) || null,
      message: (formData.get('message') as string | null) || null,
      source: ((formData.get('source') as LeadSource | null) ?? 'manuel'),
      budget,
      property_type: (formData.get('property_type') as string | null) || null,
      location_desired: (formData.get('location_desired') as string | null) || null,
      status: 'nouveau',
      tags: [],
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Trigger sequences with trigger_on='lead_created' — fire-and-forget
  autoEnrollNewLead(agencyId, data.id).catch((err) =>
    console.error('[createLead] auto-enroll failed', err)
  )

  revalidatePath('/leads')
  return { lead: data }
}

export async function updateLead(leadId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const budgetRaw = formData.get('budget') as string | null
  const budget = budgetRaw ? parseInt(budgetRaw, 10) || null : null

  const statusRaw = formData.get('status') as LeadStatus | null
  const sourceRaw = formData.get('source') as LeadSource | null

  const { error } = await supabase
    .from('leads')
    .update({
      first_name: formData.get('first_name') as string,
      last_name: (formData.get('last_name') as string | null) || null,
      email: (formData.get('email') as string | null) || null,
      phone: (formData.get('phone') as string | null) || null,
      message: (formData.get('message') as string | null) || null,
      notes: (formData.get('notes') as string | null) || null,
      source: sourceRaw ?? undefined,
      status: statusRaw ?? undefined,
      budget,
      property_type: (formData.get('property_type') as string | null) || null,
      location_desired: (formData.get('location_desired') as string | null) || null,
    })
    .eq('id', leadId)
    .eq('agency_id', agencyId)

  if (error) return { error: error.message }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

export async function updateLeadNotes(leadId: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { error } = await supabase
    .from('leads')
    .update({ notes: notes || null })
    .eq('id', leadId)
    .eq('agency_id', agencyId)

  if (error) return { error: error.message }

  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)

  if (error) return { error: error.message }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

export async function deleteLead(leadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { data: deleted, error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('agency_id', agencyId)
    .select('id')

  if (error) {
    console.error('[deleteLead] error', { leadId, message: error.message, code: error.code })
    return { error: error.message }
  }
  if (!deleted || deleted.length === 0) {
    console.error('[deleteLead] 0 rows deleted — RLS block or wrong id', { leadId, agencyId })
    return { error: 'Lead introuvable ou accès refusé' }
  }

  revalidatePath('/leads')
  return { success: true }
}

export async function importLeads(rows: Array<{
  first_name: string
  last_name?: string | null
  email?: string | null
  phone?: string | null
  budget?: number | null
  message?: string | null
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const toInsert = rows
    .filter(r => r.first_name?.trim())
    .map(r => ({
      agency_id: agencyId,
      first_name: r.first_name.trim(),
      last_name: r.last_name?.trim() || null,
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      budget: typeof r.budget === 'number' && !isNaN(r.budget) ? r.budget : null,
      message: r.message?.trim() || null,
      source: 'import' as LeadSource,
      status: 'nouveau' as LeadStatus,
      tags: [],
    }))

  if (toInsert.length === 0) return { error: 'Aucun lead valide trouvé. Vérifiez que votre CSV contient une colonne "prénom" ou "first_name".' }

  const { data, error } = await supabase
    .from('leads')
    .insert(toInsert)
    .select('id')

  if (error) return { error: error.message }

  revalidatePath('/leads')
  return { count: data?.length ?? 0 }
}

export async function qualifyLeadWithAI(leadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('agency_id', agencyId)
    .single()

  if (!lead) return { error: 'Lead introuvable' }

  let analysis
  try {
    analysis = await qualifyLead({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      source: lead.source,
      budget: lead.budget,
    })
  } catch {
    return { error: 'Erreur IA — vérifiez la clé OpenAI' }
  }

  const { error } = await supabase
    .from('leads')
    .update({
      ai_score: analysis.score,
      ai_analysis: analysis as unknown as import('@/types/database').Database['public']['Tables']['leads']['Row']['ai_analysis'],
    })
    .eq('id', leadId)

  if (error) return { error: error.message }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  return { analysis }
}
