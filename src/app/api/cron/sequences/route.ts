import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, buildAgentFromAddress } from '@/lib/resend'
import { sendSMS, sendWhatsApp } from '@/lib/twilio'

export const runtime = 'nodejs'

// Vercel Cron — runs daily at 9h UTC (vercel.json)
// Processes pending sequence enrollments and sends messages when delay has elapsed
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    console.error('[sequences cron] CRON_SECRET is not set in environment variables')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    console.error('[sequences cron] Authorization mismatch — expected Bearer <CRON_SECRET>, received:', auth?.slice(0, 15) ?? '(none)')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Log env var presence so we can confirm config in Vercel logs
  console.log('[sequences cron] env check — RESEND_API_KEY:', process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 8)}…)` : 'MISSING')
  console.log('[sequences cron] env check — RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL ?? '(using default noreply@mandato.fr)')
  console.log('[sequences cron] env check — TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `set (${process.env.TWILIO_ACCOUNT_SID.slice(0, 8)}…)` : 'MISSING')
  console.log('[sequences cron] env check — TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ?? 'MISSING')
  console.log('[sequences cron] env check — TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER ?? 'MISSING')

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Fetch enrollments whose next step is due
  const { data: enrollments, error } = await supabase
    .from('sequence_enrollments')
    .select(`
      id, lead_id, sequence_id, agency_id, current_step,
      leads ( first_name, last_name, email, phone ),
      sequences ( name )
    `)
    .eq('status', 'actif')
    .lte('next_step_at', now)
    .limit(100)

  if (error) {
    console.error('[sequences cron] fetch error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!enrollments || enrollments.length === 0) {
    console.log('[sequences cron] no enrollments due at', now)
    return NextResponse.json({ ok: true, processed: 0, timestamp: now })
  }

  console.log(`[sequences cron] ${enrollments.length} enrollment(s) due`)

  // Build agencyId → "Name <local@withmandato.com>" map for email From header
  const agencyIds = [...new Set(enrollments.map(e => e.agency_id))]
  const { data: ownerMembers } = await supabase
    .from('agency_members')
    .select('agency_id, profiles(full_name)')
    .in('agency_id', agencyIds)
    .eq('role', 'owner')

  const agencyFromMap = new Map<string, string>()
  for (const m of (ownerMembers ?? [])) {
    const profile = (m as unknown as { agency_id: string; profiles: { full_name: string | null } | null })
    agencyFromMap.set(profile.agency_id, buildAgentFromAddress(profile.profiles?.full_name))
  }
  console.log('[sequences cron] from addresses:', Object.fromEntries(agencyFromMap))

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const enrollment of enrollments) {
    const ctx = `enrollment=${enrollment.id} sequence=${enrollment.sequence_id} lead=${enrollment.lead_id} step=${enrollment.current_step + 1}`
    try {
      const lead = enrollment.leads as unknown as {
        first_name: string
        last_name: string | null
        email: string | null
        phone: string | null
      } | null

      if (!lead) {
        console.error(`[sequences cron] ${ctx} — lead data missing (join failed)`)
        skipped++
        continue
      }

      console.log(`[sequences cron] ${ctx} | lead="${lead.first_name} ${lead.last_name ?? ''}" email=${lead.email ?? 'null'} phone=${lead.phone ?? 'null'}`)

      const nextStepOrder = enrollment.current_step + 1

      // Fetch the step to execute
      const { data: step, error: stepErr } = await supabase
        .from('sequence_steps')
        .select('step_order, channel, subject, content_template, delay_hours')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_order', nextStepOrder)
        .single()

      if (stepErr || !step) {
        console.log(`[sequences cron] ${ctx} — no step ${nextStepOrder} found (${stepErr?.code ?? 'PGRST116'}), marking termine`)
        await supabase
          .from('sequence_enrollments')
          .update({ status: 'termine', completed_at: new Date().toISOString() })
          .eq('id', enrollment.id)
        processed++
        continue
      }

      console.log(`[sequences cron] ${ctx} | channel=${step.channel} subject="${step.subject ?? ''}" delay=${step.delay_hours}h`)

      // Personalize template variables
      const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
      const content = step.content_template
        .replace(/\{first_name\}/g, lead.first_name)
        .replace(/\{last_name\}/g, lead.last_name ?? '')
        .replace(/\{name\}/g, fullName)

      const sentAt = new Date().toISOString()

      // Find or create conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', enrollment.lead_id)
        .eq('channel', step.channel)
        .maybeSingle()

      let conversationId: string
      if (existingConv) {
        conversationId = existingConv.id
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({
            agency_id: enrollment.agency_id,
            lead_id: enrollment.lead_id,
            channel: step.channel,
          })
          .select('id')
          .single()
        if (convErr || !newConv) {
          console.error(`[sequences cron] ${ctx} — conversation create error: ${convErr?.message}`)
          failed++
          continue
        }
        conversationId = newConv.id
      }

      // Send via appropriate channel
      let messageSent = false
      let sendSkipReason: string | null = null

      try {
        if (step.channel === 'email') {
          if (!lead.email) {
            sendSkipReason = 'lead has no email address'
          } else {
            const from = agencyFromMap.get(enrollment.agency_id)
            console.log(`[sequences cron] ${ctx} — calling sendEmail → ${lead.email} | from: ${from ?? '(default)'}`)
            await sendEmail({
              to: lead.email,
              subject: step.subject ?? 'Message de votre conseiller immobilier',
              text: content,
              from,
            })
            console.log(`[sequences cron] ${ctx} — sendEmail OK`)
            messageSent = true
          }
        } else if (step.channel === 'sms') {
          if (!lead.phone) {
            sendSkipReason = 'lead has no phone number'
          } else {
            console.log(`[sequences cron] ${ctx} — calling sendSMS → ${lead.phone}`)
            await sendSMS({ to: lead.phone, body: content })
            console.log(`[sequences cron] ${ctx} — sendSMS OK`)
            messageSent = true
          }
        } else if (step.channel === 'whatsapp') {
          if (!lead.phone) {
            sendSkipReason = 'lead has no phone number'
          } else {
            console.log(`[sequences cron] ${ctx} — calling sendWhatsApp → ${lead.phone}`)
            await sendWhatsApp({ to: lead.phone, body: content })
            console.log(`[sequences cron] ${ctx} — sendWhatsApp OK`)
            messageSent = true
          }
        } else if (step.channel === 'note') {
          messageSent = true
        }
      } catch (sendErr) {
        const msg = sendErr instanceof Error ? sendErr.message : JSON.stringify(sendErr)
        console.error(`[sequences cron] ${ctx} — ${step.channel} send FAILED: ${msg}`)
        failed++
        // Don't advance enrollment when send fails so it retries next cron run
        continue
      }

      if (sendSkipReason) {
        console.warn(`[sequences cron] ${ctx} — skipped send: ${sendSkipReason}`)
        skipped++
        // Still advance so we don't retry a step that can never send
      }

      // Record message in DB for timeline
      if (messageSent) {
        const { error: msgErr } = await supabase.from('messages').insert({
          agency_id: enrollment.agency_id,
          lead_id: enrollment.lead_id,
          conversation_id: conversationId,
          sender_id: null,
          channel: step.channel,
          direction: 'sortant',
          content,
          subject: step.subject ?? null,
          is_ai_generated: false,
          status: 'sent',
          sent_at: sentAt,
        })
        if (msgErr) {
          console.error(`[sequences cron] ${ctx} — messages insert error: ${msgErr.message}`)
        }
        await supabase
          .from('conversations')
          .update({ last_message_at: sentAt })
          .eq('id', conversationId)
      }

      // Advance enrollment to next step or mark complete
      const { data: followingStep } = await supabase
        .from('sequence_steps')
        .select('delay_hours')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_order', nextStepOrder + 1)
        .single()

      if (followingStep) {
        const nextAt = new Date(
          Date.now() + followingStep.delay_hours * 60 * 60 * 1000
        ).toISOString()
        await supabase
          .from('sequence_enrollments')
          .update({ current_step: nextStepOrder, next_step_at: nextAt })
          .eq('id', enrollment.id)
        console.log(`[sequences cron] ${ctx} — advanced to step ${nextStepOrder + 1}, next_step_at=${nextAt}`)
      } else {
        await supabase
          .from('sequence_enrollments')
          .update({
            current_step: nextStepOrder,
            status: 'termine',
            completed_at: new Date().toISOString(),
          })
          .eq('id', enrollment.id)
        console.log(`[sequences cron] ${ctx} — no more steps, marked termine`)
      }

      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error(`[sequences cron] ${ctx} — unexpected error: ${msg}`)
      failed++
    }
  }

  console.log(`[sequences cron] done — processed=${processed} skipped=${skipped} failed=${failed}`)
  return NextResponse.json({ ok: true, processed, skipped, failed, timestamp: now })
}
