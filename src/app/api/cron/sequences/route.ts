import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { sendSMS, sendWhatsApp } from '@/lib/twilio'

export const runtime = 'nodejs'

// Vercel Cron — runs daily at 9h UTC (vercel.json)
// Processes pending sequence enrollments and sends messages when delay has elapsed
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    return NextResponse.json({ ok: true, processed: 0, timestamp: now })
  }

  let processed = 0

  for (const enrollment of enrollments) {
    try {
      const lead = enrollment.leads as unknown as {
        first_name: string
        last_name: string | null
        email: string | null
        phone: string | null
      } | null

      if (!lead) continue

      const nextStepOrder = enrollment.current_step + 1

      // Fetch the step to execute
      const { data: step } = await supabase
        .from('sequence_steps')
        .select('step_order, channel, subject, content_template, delay_hours')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_order', nextStepOrder)
        .single()

      if (!step) {
        // No step found — sequence already complete
        await supabase
          .from('sequence_enrollments')
          .update({ status: 'termine', completed_at: new Date().toISOString() })
          .eq('id', enrollment.id)
        processed++
        continue
      }

      // Personalize template variables
      const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
      const content = step.content_template
        .replace(/\{first_name\}/g, lead.first_name)
        .replace(/\{last_name\}/g, lead.last_name ?? '')
        .replace(/\{name\}/g, fullName)

      const sentAt = new Date().toISOString()

      // Find or create a conversation for this lead+channel (required by messages table)
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
          console.error('[sequences cron] conversation create error', convErr)
          continue
        }
        conversationId = newConv.id
      }

      // Send the message via the appropriate channel
      let messageSent = false
      try {
        if (step.channel === 'email' && lead.email) {
          await sendEmail({
            to: lead.email,
            subject: step.subject ?? 'Message de votre conseiller immobilier',
            text: content,
          })
          messageSent = true
        } else if (step.channel === 'sms' && lead.phone) {
          await sendSMS({ to: lead.phone, body: content })
          messageSent = true
        } else if (step.channel === 'whatsapp' && lead.phone) {
          await sendWhatsApp({ to: lead.phone, body: content })
          messageSent = true
        } else if (step.channel === 'note') {
          messageSent = true
        }
      } catch (sendErr) {
        console.error('[sequences cron] send error', {
          enrollmentId: enrollment.id,
          channel: step.channel,
          err: sendErr,
        })
      }

      // Record in messages table so it appears in the lead timeline
      if (messageSent) {
        await supabase.from('messages').insert({
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

        if (conversationId) {
          await supabase
            .from('conversations')
            .update({ last_message_at: sentAt })
            .eq('id', conversationId)
        }
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
      } else {
        await supabase
          .from('sequence_enrollments')
          .update({
            current_step: nextStepOrder,
            status: 'termine',
            completed_at: new Date().toISOString(),
          })
          .eq('id', enrollment.id)
      }

      processed++
    } catch (err) {
      console.error('[sequences cron] enrollment error', { id: enrollment.id, err })
    }
  }

  return NextResponse.json({ ok: true, processed, timestamp: now })
}
