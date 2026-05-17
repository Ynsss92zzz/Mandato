import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, buildAgencyFromAddress } from '@/lib/resend'
import { sendSMS, sendWhatsApp, formatE164FR } from '@/lib/twilio'

export const runtime = 'nodejs'

// Vercel Cron — runs every hour (vercel.json: "0 * * * *")
// Processes pending sequence enrollments and sends messages when delay has elapsed
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    console.error('[sequences cron] CRON_SECRET is not set in environment variables')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    console.error('[sequences cron] Authorization mismatch — received:', auth?.slice(0, 20) ?? '(none)')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[sequences cron] ═══ START ═══')
  console.log('[sequences cron] env — RESEND_API_KEY:', process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 8)}…)` : '⚠ MISSING')
  console.log('[sequences cron] env — RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL ?? '(default noreply@mandato.fr)')
  console.log('[sequences cron] env — BREVO_API_KEY:', process.env.BREVO_API_KEY ? `set (${process.env.BREVO_API_KEY.slice(0, 8)}…)` : '⚠ MISSING')
  console.log('[sequences cron] env — BREVO_SMS_SENDER:', process.env.BREVO_SMS_SENDER ?? '(default Mandato)')
  console.log('[sequences cron] env — TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER ?? '⚠ MISSING (WhatsApp only)')

  const supabase = createAdminClient()
  const now = new Date().toISOString()
  console.log('[sequences cron] now =', now)

  // Fetch enrollments whose next step is due (next_step_at <= now OR next_step_at IS NULL)
  // NULL next_step_at is treated as immediately due — PostgreSQL excludes NULL in lte() comparisons
  const { data: enrollments, error } = await supabase
    .from('sequence_enrollments')
    .select(`
      id, lead_id, sequence_id, agency_id, current_step, next_step_at,
      leads ( first_name, last_name, email, phone, budget, property_type ),
      sequences ( name )
    `)
    .eq('status', 'actif')
    .or(`next_step_at.lte.${now},next_step_at.is.null`)
    .limit(100)

  if (error) {
    console.error('[sequences cron] ⚠ fetch error — code:', error.code, '| message:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[sequences cron] fetch returned', enrollments?.length ?? 0, 'enrollment(s) due (next_step_at <=', now, ')')

  // DIAGNOSTIC: dump ALL actif enrollments regardless of next_step_at to expose NULL / future values
  {
    const { data: allActif } = await supabase
      .from('sequence_enrollments')
      .select('id, sequence_id, status, current_step, next_step_at')
      .eq('status', 'actif')
      .order('next_step_at', { ascending: true, nullsFirst: true })

    console.log('[sequences cron] ALL actif enrollments in DB:', JSON.stringify(
      (allActif ?? []).map(e => ({
        id: e.id.slice(0, 8),
        seq: e.sequence_id.slice(0, 8),
        step: e.current_step,
        next_step_at: e.next_step_at ?? 'NULL',
        verdict: e.next_step_at === null
          ? '⚠ NULL → excluded by lte filter'
          : e.next_step_at <= now
            ? '✓ due'
            : `✗ future (${e.next_step_at})`,
      }))
    ))
  }

  if (!enrollments || enrollments.length === 0) {
    console.log('[sequences cron] ═══ END (nothing to do) ═══')
    return NextResponse.json({ ok: true, processed: 0, timestamp: now })
  }

  // Dump enrollment IDs being processed + first one raw
  console.log('[sequences cron] processing IDs:', enrollments.map(e => e.id.slice(0, 8)).join(', '))
  console.log('[sequences cron] first enrollment (raw):', JSON.stringify(enrollments[0]))

  // Build agencyId → "Agency Name <noreply@withmandato.com>" map for email From header
  const agencyIds = [...new Set(enrollments.map(e => e.agency_id))]
  const { data: agencies, error: agencyErr } = await supabase
    .from('agencies')
    .select('id, name')
    .in('id', agencyIds)

  if (agencyErr) console.error('[sequences cron] agency fetch error:', agencyErr.message)

  const agencyFromMap = new Map<string, string>()
  for (const a of (agencies ?? [])) {
    const agency = a as unknown as { id: string; name: string | null }
    agencyFromMap.set(agency.id, buildAgencyFromAddress(agency.name))
  }
  console.log('[sequences cron] from addresses:', Object.fromEntries(agencyFromMap))

  // DIAGNOSTIC: dump all steps for sequences being processed so we can verify step_order and channel
  {
    const seqIds = [...new Set(enrollments.map(e => e.sequence_id))]
    const { data: allSteps, error: stepsErr } = await supabase
      .from('sequence_steps')
      .select('sequence_id, step_order, channel, delay_hours')
      .in('sequence_id', seqIds)
      .order('step_order')

    if (stepsErr) {
      console.error('[sequences cron] ⚠ steps diagnostic fetch error:', stepsErr.message)
    } else {
      console.log('[sequences cron] steps in DB for these sequences:', JSON.stringify(
        (allSteps ?? []).map(s => ({
          seq: s.sequence_id.slice(0, 8),
          order: s.step_order,
          channel: s.channel,           // raw value — check for typos/case/whitespace
          channel_json: JSON.stringify(s.channel), // reveals invisible chars
          delay: `${s.delay_hours}h`,
        }))
      ))
    }

    console.log('[sequences cron] enrollments → expected step_orders:', JSON.stringify(
      enrollments.map(e => ({
        enr: e.id.slice(0, 8),
        seq: e.sequence_id.slice(0, 8),
        current_step: e.current_step,
        will_seek_order: e.current_step + 1,
      }))
    ))
  }

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const enrollment of enrollments) {
    const ctx = `[enr=${enrollment.id.slice(0, 8)} seq=${enrollment.sequence_id.slice(0, 8)} lead=${enrollment.lead_id.slice(0, 8)}]`
    try {
      console.log(`${ctx} ── processing step=${enrollment.current_step + 1} next_step_at=${enrollment.next_step_at}`)

      const lead = enrollment.leads as unknown as {
        first_name: string
        last_name: string | null
        email: string | null
        phone: string | null
        budget: number | null
        property_type: string | null
      } | null

      if (!lead) {
        // The leads join failed — likely missing FK constraint in DB
        console.error(`${ctx} ⚠ leads join returned null — check FK sequence_enrollments.lead_id → leads.id in DB`)
        console.error(`${ctx} raw enrollment.leads =`, JSON.stringify((enrollment as Record<string, unknown>).leads))
        skipped++
        continue
      }

      console.log(`${ctx} lead: "${lead.first_name} ${lead.last_name ?? ''}" | email=${lead.email ?? '(none)'} | phone=${lead.phone ?? '(none)'}`)

      const nextStepOrder = enrollment.current_step + 1

      // Fetch the step to execute
      const { data: step, error: stepErr } = await supabase
        .from('sequence_steps')
        .select('step_order, channel, subject, content_template, delay_hours')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_order', nextStepOrder)
        .single()

      if (stepErr) {
        console.error(`${ctx} ⚠ step fetch error — code:${stepErr.code} msg:${stepErr.message}`)
      }

      if (!step) {
        // No step at this order → sequence is done
        console.log(`${ctx} no step at order=${nextStepOrder} (stepErr code=${stepErr?.code ?? 'none'}) → marking termine`)
        const { error: termErr } = await supabase
          .from('sequence_enrollments')
          .update({ status: 'termine', completed_at: new Date().toISOString() })
          .eq('id', enrollment.id)
        if (termErr) console.error(`${ctx} termine update error:`, termErr.message)
        processed++
        continue
      }

      console.log(`${ctx} step: order=${step.step_order} channel=${step.channel} delay=${step.delay_hours}h subject="${step.subject ?? ''}"`)
      console.log(`${ctx} content_template (first 120 chars): "${step.content_template?.slice(0, 120) ?? '(empty!)'}"`)

      // Personalize template variables
      // Supports {{prénom}}/{{prenom}}, {{nom}}, {{email}}, {{téléphone}}/{{telephone}},
      // {{budget}}, {{bien}} — accents stripped before lookup so any variant matches.
      const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
      const budgetStr = lead.budget
        ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(lead.budget)
        : ''
      const deaccent = (s: string) =>
        s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
      const vars: Record<string, string> = {
        prenom: lead.first_name,
        nom: lead.last_name ?? '',
        email: lead.email ?? '',
        telephone: lead.phone ?? '',
        budget: budgetStr,
        bien: lead.property_type ?? '',
        // backward compat
        first_name: lead.first_name,
        last_name: lead.last_name ?? '',
        name: fullName,
      }
      const content = step.content_template
        // double-brace {{variable}} — accent-insensitive
        .replace(/\{\{([^}]+)\}\}/g, (match, key) => vars[deaccent(key)] ?? match)
        // single-brace {variable} — backward compat, exact match only
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
        console.log(`${ctx} using existing conversation ${conversationId}`)
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
          console.error(`${ctx} ⚠ conversation create error:`, convErr?.message, convErr?.code)
          failed++
          continue
        }
        conversationId = newConv.id
        console.log(`${ctx} created conversation ${conversationId}`)
      }

      // Send via appropriate channel
      let messageSent = false
      let sendSkipReason: string | null = null

      console.log(`${ctx} channel raw value: ${JSON.stringify(step.channel)} | email=${lead.email ?? 'null'} | phone=${lead.phone ?? 'null'}`)

      try {
        if (step.channel === 'email') {
          if (!lead.email) {
            sendSkipReason = 'lead has no email address'
          } else {
            const from = agencyFromMap.get(enrollment.agency_id)
            console.log(`${ctx} → sendEmail to=${lead.email} from=${from ?? '(default)'}`)
            await sendEmail({
              to: lead.email,
              subject: step.subject ?? 'Message de votre conseiller immobilier',
              text: content,
              from,
            })
            console.log(`${ctx} ✓ sendEmail OK`)
            messageSent = true
          }
        } else if (step.channel === 'sms') {
          if (!lead.phone) {
            sendSkipReason = 'lead has no phone number'
          } else {
            const e164 = formatE164FR(lead.phone.trim())
            console.log(`${ctx} → sendSMS raw=${lead.phone} e164=${e164}`)
            await sendSMS({ to: lead.phone.trim(), body: content })
            console.log(`${ctx} ✓ sendSMS OK`)
            messageSent = true
          }
        } else if (step.channel === 'whatsapp') {
          if (!lead.phone) {
            sendSkipReason = 'lead has no phone number'
          } else {
            const e164 = formatE164FR(lead.phone.trim())
            console.log(`${ctx} → sendWhatsApp raw=${lead.phone} e164=${e164}`)
            await sendWhatsApp({ to: lead.phone.trim(), body: content })
            console.log(`${ctx} ✓ sendWhatsApp OK`)
            messageSent = true
          }
        } else if (step.channel === 'note') {
          console.log(`${ctx} channel=note — no send needed`)
          messageSent = true
        } else {
          console.error(`${ctx} ⚠ unknown channel="${step.channel}"`)
          sendSkipReason = `unknown channel: ${step.channel}`
        }
      } catch (sendErr) {
        // Log the full error object so Resend/Twilio details are visible
        const errObj = sendErr as Record<string, unknown>
        console.error(
          `${ctx} ⚠ ${step.channel} send FAILED —`,
          `name: ${errObj?.name ?? '?'}`,
          `| message: ${errObj?.message ?? '?'}`,
          `| statusCode: ${errObj?.statusCode ?? errObj?.status ?? '?'}`,
          `| code: ${errObj?.code ?? '?'}`,
          `| body: ${JSON.stringify(errObj?.response ?? errObj?.body ?? errObj?.data ?? '(no body)')}`,
        )
        failed++
        continue
      }

      if (sendSkipReason) {
        console.warn(`${ctx} ⚠ send skipped: ${sendSkipReason}`)
        skipped++
      }

      // Record message in DB
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
          console.error(`${ctx} ⚠ message insert error:`, msgErr.message, msgErr.code)
        } else {
          console.log(`${ctx} message recorded in DB`)
        }
        await supabase
          .from('conversations')
          .update({ last_message_at: sentAt })
          .eq('id', conversationId)
      }

      // Advance enrollment to next step or mark complete
      const { data: followingStep, error: followErr } = await supabase
        .from('sequence_steps')
        .select('delay_hours')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_order', nextStepOrder + 1)
        .single()

      if (followErr && followErr.code !== 'PGRST116') {
        console.error(`${ctx} following step fetch error:`, followErr.message)
      }

      if (followingStep) {
        const nextAt = new Date(Date.now() + followingStep.delay_hours * 60 * 60 * 1000).toISOString()
        const { error: advErr } = await supabase
          .from('sequence_enrollments')
          .update({ current_step: nextStepOrder, next_step_at: nextAt })
          .eq('id', enrollment.id)
        if (advErr) {
          console.error(`${ctx} advance update error:`, advErr.message)
        } else {
          console.log(`${ctx} ✓ advanced → step ${nextStepOrder + 1}, next_step_at=${nextAt}`)
        }
      } else {
        const { error: termErr } = await supabase
          .from('sequence_enrollments')
          .update({ current_step: nextStepOrder, status: 'termine', completed_at: new Date().toISOString() })
          .eq('id', enrollment.id)
        if (termErr) {
          console.error(`${ctx} termine update error:`, termErr.message)
        } else {
          console.log(`${ctx} ✓ sequence complete — marked termine`)
        }
      }

      processed++
    } catch (err) {
      const errObj = err as Record<string, unknown>
      console.error(`${ctx} ⚠ unexpected error — message: ${errObj?.message ?? JSON.stringify(err)}`)
      failed++
    }
  }

  console.log(`[sequences cron] ═══ END — processed=${processed} skipped=${skipped} failed=${failed} ═══`)
  return NextResponse.json({ ok: true, processed, skipped, failed, timestamp: now })
}
