import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Compatible with SendGrid, Mailgun, and Resend inbound email webhooks.
// The recipient address format: leads-{agency-slug}@mandato.fr
// The email routing service forwards POST requests to this route.

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''

  let senderEmail = ''
  let senderName = ''
  let subject = ''
  let body = ''
  let recipient = ''

  if (contentType.includes('application/json')) {
    // Resend / generic JSON format
    const json = await request.json() as Record<string, unknown>
    senderEmail = String(json.from ?? json.sender ?? '')
    senderName = String(json.from_name ?? json.sender_name ?? '')
    subject = String(json.subject ?? '')
    body = String(json.text ?? json.plain ?? json.body ?? '')
    recipient = String(json.to ?? json.recipient ?? '')
  } else {
    // Mailgun / SendGrid multipart form format
    const form = await request.formData()
    senderEmail = String(form.get('sender') ?? form.get('from') ?? '')
    senderName = String(form.get('from_name') ?? '')
    subject = String(form.get('subject') ?? '')
    body = String(form.get('body-plain') ?? form.get('text') ?? '')
    recipient = String(form.get('recipient') ?? form.get('to') ?? '')
  }

  // Extract agency slug from recipient: leads-{slug}@mandato.fr or leads+{agency-id}@...
  const slugMatch = recipient.match(/leads[-+]([^@]+)@/)
  const agencySlugOrId = slugMatch?.[1]

  if (!agencySlugOrId) {
    return NextResponse.json({ error: 'Recipient format invalide' }, { status: 400 })
  }

  // Parse sender name/email
  const nameFromEmail = senderEmail.split('@')[0].replace(/[._+]/g, ' ').trim()
  const firstName = (senderName || nameFromEmail).split(/\s+/)[0] || 'Inconnu'
  const lastName = senderName ? senderName.split(/\s+/).slice(1).join(' ') || null : null

  const supabase = createAdminClient()

  // Find agency by slug or ID
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .or(`slug.eq.${agencySlugOrId},id.eq.${agencySlugOrId}`)
    .maybeSingle()

  if (!agency) {
    return NextResponse.json({ error: 'Agence introuvable' }, { status: 404 })
  }

  // Avoid duplicate leads from the same email
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('agency_id', agency.id)
    .eq('email', senderEmail)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const messageText = `${subject ? `Objet : ${subject}\n\n` : ''}${body}`.trim().slice(0, 2000)

  const { error } = await supabase.from('leads').insert({
    agency_id: agency.id,
    first_name: firstName,
    last_name: lastName,
    email: senderEmail,
    message: messageText || null,
    source: 'import',
    status: 'nouveau',
    tags: [],
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
