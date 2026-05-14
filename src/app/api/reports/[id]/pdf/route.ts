import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateWeeklyReportPdf } from '@/lib/pdf/weekly-report'

export const runtime = 'nodejs'

interface WeeklyReport {
  id: string
  agency_id: string
  week_start: string
  week_end: string
  new_leads: number
  total_leads: number
  won_leads: number
  conv_rate: number
  appointments_count: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Verify user session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch report (weekly_reports not yet in generated types — cast via unknown)
  const { data: report, error } = await admin
    .from('weekly_reports' as never)
    .select('*, agencies(name)')
    .eq('id' as never, id)
    .single() as unknown as { data: (WeeklyReport & { agencies: { name: string } | null }) | null; error: unknown }

  if (error || !report) {
    return Response.json({ error: 'Report not found' }, { status: 404 })
  }

  // Ensure the requesting user belongs to this agency
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .eq('agency_id', report.agency_id)
    .single()

  if (!member) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const agencyName = report.agencies?.name ?? 'Agence'

  const pdfBuffer = await generateWeeklyReportPdf({
    agencyName,
    weekStart: report.week_start,
    weekEnd: report.week_end,
    newLeads: report.new_leads,
    totalLeads: report.total_leads,
    wonLeads: report.won_leads,
    convRate: report.conv_rate,
    appointmentsCount: report.appointments_count,
  })

  const filename = `rapport-semaine-${report.week_start}.pdf`
  return new Response(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
