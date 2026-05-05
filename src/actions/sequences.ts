'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { MessageChannel } from '@/types'

type SequenceStatus = 'actif' | 'pause' | 'archive'

async function getAgencyId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', userId)
    .single()
  return data?.agency_id ?? null
}

export interface StepDraft {
  delay_hours: number
  channel: MessageChannel
  subject: string | null
  content_template: string
  is_ai_generated: boolean
}

export async function saveSequenceWithSteps(
  sequenceId: string,
  metadata: { name: string; trigger_on: string; status: SequenceStatus },
  steps: StepDraft[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  if (!metadata.name.trim()) return { error: 'Le nom est obligatoire' }

  let finalId = sequenceId

  if (sequenceId === 'new') {
    const { data, error } = await supabase
      .from('sequences')
      .insert({
        agency_id: agencyId,
        name: metadata.name.trim(),
        trigger_on: metadata.trigger_on,
        status: metadata.status,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    finalId = data.id
  } else {
    const { error } = await supabase
      .from('sequences')
      .update({
        name: metadata.name.trim(),
        trigger_on: metadata.trigger_on,
        status: metadata.status,
      })
      .eq('id', sequenceId)
      .eq('agency_id', agencyId)
    if (error) return { error: error.message }

    await supabase
      .from('sequence_steps')
      .delete()
      .eq('sequence_id', sequenceId)
  }

  if (steps.length > 0) {
    const { error } = await supabase
      .from('sequence_steps')
      .insert(
        steps.map((step, index) => ({
          sequence_id: finalId,
          agency_id: agencyId,
          step_order: index + 1,
          delay_hours: step.delay_hours,
          channel: step.channel,
          subject: step.subject || null,
          content_template: step.content_template,
          is_ai_generated: step.is_ai_generated,
        }))
      )
    if (error) return { error: error.message }
  }

  revalidatePath('/sequences')
  revalidatePath(`/sequences/${finalId}`)
  return { id: finalId }
}

export async function updateSequenceStatus(sequenceId: string, status: SequenceStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { error } = await supabase
    .from('sequences')
    .update({ status })
    .eq('id', sequenceId)
    .eq('agency_id', agencyId)

  if (error) return { error: error.message }

  revalidatePath('/sequences')
  return { success: true }
}

export async function deleteSequence(sequenceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { data: deleted, error } = await supabase
    .from('sequences')
    .delete()
    .eq('id', sequenceId)
    .eq('agency_id', agencyId)
    .select('id')

  if (error) {
    console.error('[deleteSequence] error', { sequenceId, message: error.message, code: error.code })
    return { error: error.message }
  }
  if (!deleted || deleted.length === 0) {
    console.error('[deleteSequence] 0 rows deleted — RLS block or wrong id', { sequenceId, agencyId })
    return { error: 'Séquence introuvable ou accès refusé' }
  }

  revalidatePath('/sequences')
  return { success: true }
}

export async function enrollLeadInSequence(sequenceId: string, leadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { data, error } = await supabase
    .from('sequence_enrollments')
    .insert({
      sequence_id: sequenceId,
      agency_id: agencyId,
      lead_id: leadId,
      status: 'actif',
      current_step: 0,
      next_step_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { enrollment: data }
}

export async function stopEnrollment(enrollmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'stoppe', completed_at: new Date().toISOString() })
    .eq('id', enrollmentId)

  if (error) return { error: error.message }
  return { success: true }
}
