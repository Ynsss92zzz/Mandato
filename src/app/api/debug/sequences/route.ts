import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Diagnostic endpoint — requires same Bearer token as cron
// GET /api/debug/sequences
// Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const [
    { data: sequences, error: seqErr },
    { data: steps, error: stepsErr },
    { data: enrollments, error: enrollErr },
  ] = await Promise.all([
    supabase
      .from('sequences')
      .select('id, name, status, trigger_on')
      .order('name'),

    supabase
      .from('sequence_steps')
      .select('id, sequence_id, step_order, channel, delay_hours, subject')
      .order('sequence_id')
      .order('step_order'),

    supabase
      .from('sequence_enrollments')
      .select(`
        id, sequence_id, lead_id, agency_id,
        status, current_step, next_step_at, enrolled_at, completed_at,
        leads ( first_name, last_name, email, phone ),
        sequences ( name )
      `)
      .order('enrolled_at', { ascending: false })
      .limit(50),
  ])

  const allEnrollments = (enrollments ?? []) as unknown as Array<{
    id: string
    sequence_id: string
    lead_id: string
    agency_id: string
    status: string
    current_step: number
    next_step_at: string | null
    enrolled_at: string
    completed_at: string | null
    leads: { first_name: string; last_name: string | null; email: string | null; phone: string | null } | null
    sequences: { name: string } | null
  }>

  const duePast = allEnrollments.filter(
    e => e.status === 'actif' && e.next_step_at && e.next_step_at <= now
  )
  const dueFuture = allEnrollments.filter(
    e => e.status === 'actif' && e.next_step_at && e.next_step_at > now
  )

  const byStatus = allEnrollments.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({
    now,
    errors: {
      sequences: seqErr?.message ?? null,
      steps: stepsErr?.message ?? null,
      enrollments: enrollErr?.message ?? null,
    },
    summary: {
      sequences_count: sequences?.length ?? 0,
      steps_count: steps?.length ?? 0,
      enrollments_total: allEnrollments.length,
      enrollments_actif_due_NOW: duePast.length,
      enrollments_actif_future: dueFuture.length,
      enrollments_by_status: byStatus,
    },
    sequences,
    steps,
    enrollments_due_now: duePast.map(e => ({
      id: e.id,
      sequence: e.sequences?.name,
      lead_name: e.leads ? `${e.leads.first_name} ${e.leads.last_name ?? ''}`.trim() : null,
      lead_email: e.leads?.email ?? null,
      lead_phone: e.leads?.phone ?? null,
      current_step: e.current_step,
      next_step_at: e.next_step_at,
      enrolled_at: e.enrolled_at,
    })),
    enrollments_actif_future: dueFuture.map(e => ({
      id: e.id,
      sequence: e.sequences?.name,
      lead_name: e.leads ? `${e.leads.first_name} ${e.leads.last_name ?? ''}`.trim() : null,
      current_step: e.current_step,
      next_step_at: e.next_step_at,
      enrolled_at: e.enrolled_at,
    })),
    all_enrollments: allEnrollments,
  })
}
