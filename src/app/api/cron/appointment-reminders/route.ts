import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToMany, type StoredSubscription } from '@/lib/push'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const in60 = new Date(now.getTime() + 60 * 60 * 1000)
  const in90 = new Date(now.getTime() + 90 * 60 * 1000)

  // Appointments starting in 60–90 minutes (check every hour → 30min window buffer)
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, agency_id, title, scheduled_at')
    .gte('scheduled_at', in60.toISOString())
    .lte('scheduled_at', in90.toISOString())
    .eq('status', 'planifie')

  let notified = 0
  for (const appt of appointments ?? []) {
    const { data: pushSubs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('agency_id', appt.agency_id)

    if (!pushSubs || pushSubs.length === 0) continue

    const time = new Date(appt.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    await sendPushToMany(pushSubs as StoredSubscription[], {
      title: 'RDV dans 1 heure',
      body: `${appt.title} — ${time}`,
      url: '/appointments',
    })
    notified++
  }

  return NextResponse.json({ success: true, notified })
}
