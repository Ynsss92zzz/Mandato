import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Cron — runs on the 1st of every month at midnight UTC
// Resets leads_this_month counter for all subscriptions
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { error, count } = await supabase
    .from('subscriptions')
    .update({
      leads_this_month: 0,
      leads_month_reset_at: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ).toISOString(),
    })
    .lte('leads_month_reset_at', new Date().toISOString())
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reset: count ?? 0, timestamp: new Date().toISOString() })
}
