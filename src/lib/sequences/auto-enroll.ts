import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Finds active sequences with trigger_on='lead_created' for the agency
 * and creates a sequence_enrollment for the new lead.
 * Uses the admin client so it works from both server actions and API routes.
 */
export async function autoEnrollNewLead(agencyId: string, leadId: string): Promise<void> {
  const ctx = `autoEnrollNewLead agencyId=${agencyId} leadId=${leadId}`
  console.log(`[${ctx}] start`)

  const supabase = createAdminClient()

  const { data: sequences, error: seqErr } = await supabase
    .from('sequences')
    .select('id, name')
    .eq('agency_id', agencyId)
    .eq('trigger_on', 'lead_created')
    .eq('status', 'actif')

  if (seqErr) {
    console.error(`[${ctx}] error fetching sequences:`, seqErr.message)
    return
  }

  if (!sequences || sequences.length === 0) {
    console.log(`[${ctx}] no active sequences with trigger_on=lead_created — nothing to enroll`)
    return
  }

  console.log(`[${ctx}] found ${sequences.length} sequence(s):`, sequences.map(s => `${s.name}(${s.id})`).join(', '))

  for (const seq of sequences) {
    const seqCtx = `${ctx} seq=${seq.id}`

    // Skip if already enrolled (idempotent)
    const { count, error: countErr } = await supabase
      .from('sequence_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_id', seq.id)
      .eq('lead_id', leadId)

    if (countErr) {
      console.error(`[${seqCtx}] error checking existing enrollment:`, countErr.message)
      continue
    }

    if (count && count > 0) {
      console.log(`[${seqCtx}] lead already enrolled — skip`)
      continue
    }

    // Fetch first step to determine initial next_step_at
    const { data: firstStep, error: stepErr } = await supabase
      .from('sequence_steps')
      .select('step_order, delay_hours')
      .eq('sequence_id', seq.id)
      .order('step_order', { ascending: true })
      .limit(1)
      .single()

    if (stepErr || !firstStep) {
      console.error(`[${seqCtx}] no steps found (${stepErr?.message ?? 'empty result'}) — skip`)
      continue
    }

    console.log(`[${seqCtx}] first step: order=${firstStep.step_order} delay=${firstStep.delay_hours}h`)

    const nextStepAt = new Date(
      Date.now() + firstStep.delay_hours * 60 * 60 * 1000
    ).toISOString()

    const { error: insertErr } = await supabase
      .from('sequence_enrollments')
      .insert({
        sequence_id: seq.id,
        agency_id: agencyId,
        lead_id: leadId,
        status: 'actif',
        current_step: 0,
        next_step_at: nextStepAt,
      })

    if (insertErr) {
      console.error(`[${seqCtx}] enrollment insert failed:`, insertErr.message, insertErr.code)
    } else {
      console.log(`[${seqCtx}] enrolled — next_step_at=${nextStepAt}`)
    }
  }

  console.log(`[${ctx}] done`)
}
