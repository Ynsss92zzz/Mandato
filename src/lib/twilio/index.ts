import twilio from 'twilio'

// ─── Brevo — SMS transactionnel ──────────────────────────────────────────────
const BREVO_API_KEY    = process.env.BREVO_API_KEY
const BREVO_SMS_SENDER = process.env.BREVO_SMS_SENDER ?? 'Mandato'

// ─── Twilio — WhatsApp uniquement ────────────────────────────────────────────
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN
const WA_PHONE    = process.env.TWILIO_WHATSAPP_NUMBER

console.log(
  '[sms] init — Brevo key:', BREVO_API_KEY ? `set (${BREVO_API_KEY.slice(0, 8)}…)` : '⚠ MISSING',
  '| sender:', BREVO_SMS_SENDER,
  '| WA (Twilio):', WA_PHONE ?? '(undefined)',
)

function getTwilioClient() {
  return twilio(ACCOUNT_SID!, AUTH_TOKEN!)
}

/**
 * Converts a French phone number to E.164 format (+33XXXXXXXXX).
 * Handles: 0612345678, 06 12 34 56 78, 0033612345678, +33612345678
 */
export function formatE164FR(phone: string): string {
  const cleaned = phone.replace(/[\s.\-()]/g, '')

  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0033')) return '+33' + cleaned.slice(4)
  if (cleaned.startsWith('0') && cleaned.length === 10) return '+33' + cleaned.slice(1)
  if (/^\d{9}$/.test(cleaned)) return '+33' + cleaned

  return phone
}

export async function sendSMS({ to, body }: { to: string; body: string }) {
  if (!BREVO_API_KEY) throw new Error('[brevo] BREVO_API_KEY is not set')

  const recipient = formatE164FR(to.trim())
  console.log('[brevo] sendSMS — to (raw):', to, '→ (E.164):', recipient, '| sender:', BREVO_SMS_SENDER)

  const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ sender: BREVO_SMS_SENDER, recipient, content: body }),
  })

  const data = await res.json() as Record<string, unknown>

  if (!res.ok) {
    console.error(
      '[brevo] sendSMS FAILED —',
      `status: ${res.status}`,
      `| code: ${data.code ?? '?'}`,
      `| message: ${data.message ?? JSON.stringify(data)}`,
    )
    throw new Error(`Brevo SMS ${res.status}: ${data.message ?? JSON.stringify(data)}`)
  }

  console.log(
    '[brevo] sendSMS ok —',
    `messageId: ${data.messageId}`,
    `| reference: ${data.reference}`,
    `| smsCount: ${data.smsCount}`,
    `| remainingCredits: ${data.remainingCredits}`,
  )
  return data
}

export async function sendWhatsApp({ to, body }: { to: string; body: string }) {
  const formatted = formatE164FR(to.trim())
  console.log('[twilio] sendWhatsApp — to (raw):', to, '→ (E.164):', formatted, '| from:', WA_PHONE ?? '(undefined)')

  try {
    const msg = await getTwilioClient().messages.create({
      from: `whatsapp:${WA_PHONE!}`,
      to: `whatsapp:${formatted}`,
      body,
    })
    console.log('[twilio] sendWhatsApp ok — sid:', msg.sid, '| status:', msg.status)
    return msg
  } catch (err) {
    const e = err as Record<string, unknown>
    console.error(
      '[twilio] sendWhatsApp FAILED —',
      `code: ${e?.code ?? 'unknown'}`,
      `| status: ${e?.status ?? 'unknown'}`,
      `| message: ${e?.message ?? ''}`,
      `| moreInfo: ${e?.moreInfo ?? ''}`,
    )
    throw err
  }
}

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  )
}
