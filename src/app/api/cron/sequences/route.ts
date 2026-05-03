import { NextRequest, NextResponse } from 'next/server'

// Vercel Cron — runs every 15 minutes
// Processes pending sequence enrollments and sends messages when delay has elapsed
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: implement sequence step execution
  // 1. SELECT enrollments WHERE status='actif' AND next_step_at <= now()
  // 2. For each enrollment, fetch the next step template
  // 3. Send message via Resend/Twilio
  // 4. Update enrollment.current_step and next_step_at
  // 5. Mark as 'termine' if no more steps

  return NextResponse.json({ ok: true, processed: 0, timestamp: new Date().toISOString() })
}
