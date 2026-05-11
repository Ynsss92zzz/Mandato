import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Finds active sequences with trigger_on='lead_created' for the agency
 * and creates a sequence_enrollment for the new lead.
 * Uses the admin client so it works from both server actions and API routes.
 */
export async function autoEnrollNewLead(agencyId: string, leadId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: sequences } = await supabase
    .from('sequences')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('trigger_on', 'lead_created')
    .eq('status', 'actif')

  if (!sequences || sequences.length === 0) return

  for (const seq of sequences) {
    // Skip if already enrolled (idempotent)
    const { count } = await supabase
      .from('sequence_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_id', seq.id)
      .eq('lead_id', leadId)

    if (count && count > 0) continue

    // Use first step's delay_hours to schedule the first execution
    const { data: firstStep } = await supabase
      .from('sequence_steps')
      .select('delay_hours')
      .eq('sequence_id', seq.id)
      .order('step_order', { ascending: true })
      .limit(1)
      .single()

    if (!firstStep) continue

    const nextStepAt = new Date(
      Date.now() + firstStep.delay_hours * 60 * 60 * 1000
    ).toISOString()

    await supabase.from('sequence_enrollments').insert({
      sequence_id: seq.id,
      agency_id: agencyId,
      lead_id: leadId,
      status: 'actif',
      current_step: 0,
      next_step_at: nextStepAt,
    })
  }
}
