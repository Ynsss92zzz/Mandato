import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  const { agencyId } = await params
  const date = request.nextUrl.searchParams.get('date') // YYYY-MM-DD

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: avail } = await supabase
    .from('availability_settings')
    .select('days, start_hour, end_hour, slot_duration, timezone')
    .eq('agency_id', agencyId)
    .single()

  if (!avail) {
    return NextResponse.json({ slots: [] })
  }

  const dayOfWeek = new Date(`${date}T12:00:00`).getDay()
  if (!avail.days.includes(dayOfWeek)) {
    return NextResponse.json({ slots: [] })
  }

  // Generate all slots for the day
  const allSlots: string[] = []
  for (let h = avail.start_hour; h + avail.slot_duration / 60 <= avail.end_hour; h += avail.slot_duration / 60) {
    const hour = Math.floor(h)
    const min = Math.round((h - hour) * 60)
    allSlots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }

  // Filter past slots
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // Get booked slots for this day
  const dayStart = `${date}T00:00:00`
  const dayEnd   = `${date}T23:59:59`

  const { data: booked } = await supabase
    .from('appointments')
    .select('scheduled_at')
    .eq('agency_id', agencyId)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .not('status', 'eq', 'annule')

  const bookedTimes = new Set(
    (booked ?? []).map((a) =>
      new Date(a.scheduled_at).toTimeString().slice(0, 5)
    )
  )

  const available = allSlots.filter((slot) => {
    if (bookedTimes.has(slot)) return false
    if (date === todayStr) {
      const [h, m] = slot.split(':').map(Number)
      const slotDate = new Date()
      slotDate.setHours(h, m, 0, 0)
      return slotDate > now
    }
    return true
  })

  return NextResponse.json({ slots: available, duration: avail.slot_duration })
}
