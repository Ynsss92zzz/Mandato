import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoEnrollNewLead } from '@/lib/sequences/auto-enroll'

export const runtime = 'nodejs'

// ─── Svix signature verification (Resend uses Svix for inbound webhooks) ────────
// Docs: https://docs.svix.com/receiving/verifying-payloads/how
function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  const msgId        = headers.get('svix-id')
  const msgTimestamp = headers.get('svix-timestamp')
  const msgSignature = headers.get('svix-signature')

  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Reject timestamps older than 5 minutes
  const ts = parseInt(msgTimestamp, 10)
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false

  const toSign = `${msgId}.${msgTimestamp}.${rawBody}`
  const keyBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = `v1,${createHmac('sha256', keyBytes).update(toSign).digest('base64')}`

  return msgSignature.split(' ').some((sig) => {
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch {
      return false
    }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseFromHeader(from: string): { name: string | null; email: string } {
  // Handles: "Jean Dupont <jean@example.com>", <jean@example.com>, jean@example.com
  const match = from.match(/^"?([^"<>]+?)"?\s*<([^>]+)>\s*$/)
  if (match) return { name: match[1].trim() || null, email: match[2].trim().toLowerCase() }
  return { name: null, email: from.trim().toLowerCase() }
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}/)
  return match ? match[0].replace(/[\s.\-]/g, '') : null
}

function extractAgencyId(toAddresses: string | string[]): string | null {
  const addrs = Array.isArray(toAddresses) ? toAddresses : [toAddresses]
  for (const addr of addrs) {
    const match = addr.match(/leads-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/i)
    if (match) return match[1]
  }
  return null
}

function nameFromEmail(email: string): string {
  return email.split('@')[0].replace(/[._+\-]/g, ' ').trim()
}

// ─── Route ───────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const rawBody = await request.text()
  console.log('[inbound-email] received payload (first 300 chars):', rawBody.slice(0, 300))

  // Signature verification — skip in development if secret is not set
  const secret = process.env.RESEND_INBOUND_SECRET
  if (secret) {
    if (!verifySvixSignature(rawBody, request.headers as unknown as Headers, secret)) {
      console.error('[inbound-email] ⚠ invalid Svix signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('[inbound-email] ⚠ RESEND_INBOUND_SECRET not set — skipping signature check')
  }

  // Parse payload — Resend inbound format:
  // { type: "email.received", data: { from, to, subject, text, html } }
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('[inbound-email] ⚠ invalid JSON payload')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Support both top-level and nested under data (Resend wraps in { type, data })
  const data = (payload.type === 'email.received' && payload.data)
    ? payload.data as Record<string, unknown>
    : payload

  const rawFrom    = String(data.from    ?? data.sender  ?? '')
  const rawTo      = data.to ?? data.recipient ?? data.envelope_to
  const rawSubject = String(data.subject ?? '')
  const rawText    = String(data.text    ?? data.plain   ?? data['body-plain'] ?? '')

  console.log('[inbound-email] from:', rawFrom, '| to:', rawTo, '| subject:', rawSubject.slice(0, 80))

  const { name: senderName, email: senderEmail } = parseFromHeader(rawFrom)
  if (!senderEmail) {
    console.error('[inbound-email] ⚠ no sender email — aborting')
    return NextResponse.json({ error: 'No sender email' }, { status: 400 })
  }

  const agencyId = extractAgencyId(rawTo as string | string[])
  if (!agencyId) {
    console.error('[inbound-email] ⚠ could not extract agency_id from to:', rawTo)
    return NextResponse.json({ error: 'Invalid recipient format' }, { status: 400 })
  }

  console.log('[inbound-email] agency_id:', agencyId, '| sender:', senderEmail)

  const supabase = createAdminClient()

  // Verify agency exists
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('id', agencyId)
    .maybeSingle()

  if (!agency) {
    console.error('[inbound-email] ⚠ agency not found:', agencyId)
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
  }

  // Deduplicate — skip if this email already exists as a lead for this agency
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('email', senderEmail)
    .maybeSingle()

  if (existing) {
    console.log('[inbound-email] duplicate — lead already exists:', existing.id)
    return NextResponse.json({ ok: true, duplicate: true, lead_id: existing.id })
  }

  // Derive name fields
  const displayName  = senderName ?? nameFromEmail(senderEmail)
  const nameParts    = displayName.split(/\s+/)
  const firstName    = nameParts[0] || 'Inconnu'
  const lastName     = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null

  const phone        = extractPhone(rawText)
  const messageBody  = `${rawSubject ? `Objet : ${rawSubject}\n\n` : ''}${rawText}`.trim().slice(0, 2000) || null

  console.log('[inbound-email] creating lead — name:', firstName, lastName ?? '', '| phone:', phone ?? '(none)')

  const { data: lead, error: insertErr } = await supabase
    .from('leads')
    .insert({
      agency_id:  agencyId,
      first_name: firstName,
      last_name:  lastName,
      email:      senderEmail,
      phone:      phone,
      message:    messageBody,
      source:     'import' as const,
      status:     'nouveau' as const,
      tags:       [] as string[],
    })
    .select('id')
    .single()

  if (insertErr || !lead) {
    console.error('[inbound-email] ⚠ lead insert error:', insertErr?.message)
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  console.log('[inbound-email] ✓ lead created:', lead.id)

  // Create conversation + save the inbound email as a message
  try {
    // Reuse existing conversation if one was already created (e.g. by auto-enroll)
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('channel', 'email')
      .maybeSingle()

    let conversationId: string
    if (existingConv) {
      conversationId = existingConv.id
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({ agency_id: agencyId, lead_id: lead.id, channel: 'email' })
        .select('id')
        .single()
      if (convErr || !newConv) throw new Error(convErr?.message ?? 'conv insert failed')
      conversationId = newConv.id
    }

    const emailContent = rawText?.trim().slice(0, 5000) || rawSubject || '(email sans corps)'
    const now = new Date().toISOString()

    await supabase.from('messages').insert({
      agency_id:       agencyId,
      conversation_id: conversationId,
      lead_id:         lead.id,
      sender_id:       null,
      channel:         'email',
      direction:       'entrant',
      content:         emailContent,
      subject:         rawSubject || null,
      is_ai_generated: false,
      status:          'received',
      sent_at:         now,
    })

    await supabase
      .from('conversations')
      .update({ last_message_at: now })
      .eq('id', conversationId)

    console.log('[inbound-email] ✓ conversation + message created:', conversationId)
  } catch (err) {
    console.error('[inbound-email] ⚠ conversation/message error:', (err as Error).message)
  }

  // Auto-enroll in sequences with trigger_on='lead_created'
  try {
    await autoEnrollNewLead(agencyId, lead.id)
    console.log('[inbound-email] ✓ auto-enroll triggered')
  } catch (err) {
    console.error('[inbound-email] auto-enroll error:', (err as Error).message)
  }

  return NextResponse.json({ ok: true, lead_id: lead.id })
}
