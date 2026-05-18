import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateTwilioSignature } from '@/lib/twilio'
import { sendPushToMany, type StoredSubscription } from '@/lib/push'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Parse x-www-form-urlencoded body
  const params = Object.fromEntries(new URLSearchParams(rawBody))

  // Validate Twilio signature in production
  if (process.env.NODE_ENV === 'production') {
    const sig = request.headers.get('x-twilio-signature') ?? ''
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`
    if (!validateTwilioSignature(sig, url, params)) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 403 })
    }
  }

  const from: string = params.From ?? ''
  const body: string = params.Body ?? ''
  const toNumber: string = params.To ?? ''

  // Determine channel from the "To" field
  const channel = toNumber.startsWith('whatsapp:') ? 'whatsapp' : 'sms'

  // Normalize phone: strip "whatsapp:" prefix — Twilio always sends E.164
  const phoneE164 = from.replace('whatsapp:', '')
  // Also try local French format (0XXXXXXXXX) in case the lead was stored without country code
  const phoneLocal = phoneE164.startsWith('+33') ? '0' + phoneE164.slice(3) : null

  const supabase = createAdminClient()

  // Find lead by phone number — try both E.164 and local format
  const { data: lead } = await supabase
    .from('leads')
    .select('id, agency_id')
    .or(phoneLocal ? `phone.eq.${phoneE164},phone.eq.${phoneLocal}` : `phone.eq.${phoneE164}`)
    .maybeSingle()

  const phone = phoneE164

  if (!lead) {
    // Unknown sender — respond with empty TwiML so Twilio doesn't retry
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }

  // Find or create conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('channel', channel)
    .maybeSingle()

  let conversationId: string

  if (existing) {
    conversationId = existing.id
  } else {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ agency_id: lead.agency_id, lead_id: lead.id, channel })
      .select('id')
      .single()
    if (!newConv) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }
    conversationId = newConv.id
  }

  const now = new Date().toISOString()

  // Save inbound message
  await supabase.from('messages').insert({
    agency_id: lead.agency_id,
    conversation_id: conversationId,
    lead_id: lead.id,
    sender_id: null,
    channel,
    direction: 'entrant',
    content: body,
    is_ai_generated: false,
    status: 'received',
    sent_at: now,
  })

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ last_message_at: now })
    .eq('id', conversationId)

  // Update lead's last_contacted_at
  await supabase
    .from('leads')
    .update({ last_contacted_at: now })
    .eq('id', lead.id)

  // Push notification to agency members (Pro/Agence)
  const { data: pushSubs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('agency_id', lead.agency_id)

  if (pushSubs && pushSubs.length > 0) {
    await sendPushToMany(pushSubs as StoredSubscription[], {
      title: 'Nouveau message entrant',
      body: `${phone} : ${body.slice(0, 100)}`,
      url: '/conversations',
    })
  }

  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
