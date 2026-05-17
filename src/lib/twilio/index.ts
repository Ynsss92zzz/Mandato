import twilio from 'twilio'

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN
const PHONE       = process.env.TWILIO_PHONE_NUMBER
const WA_PHONE    = process.env.TWILIO_WHATSAPP_NUMBER

console.log(
  '[twilio] init — SID:', ACCOUNT_SID ? `set (${ACCOUNT_SID.slice(0, 8)}…)` : '⚠ MISSING',
  '| phone:', PHONE ?? '⚠ MISSING',
  '| wa:', WA_PHONE ?? '(undefined)',
)

function getClient() {
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
  const formatted = formatE164FR(to.trim())
  console.log('[twilio] sendSMS — to (raw):', to, '→ (E.164):', formatted, '| from:', PHONE ?? '⚠ MISSING')

  try {
    const msg = await getClient().messages.create({ from: PHONE!, to: formatted, body })
    console.log('[twilio] sendSMS ok — sid:', msg.sid, '| status:', msg.status)
    return msg
  } catch (err) {
    const e = err as Record<string, unknown>
    console.error(
      '[twilio] sendSMS FAILED —',
      `code: ${e?.code ?? 'unknown'}`,
      `| status: ${e?.status ?? 'unknown'}`,
      `| message: ${e?.message ?? ''}`,
      `| moreInfo: ${e?.moreInfo ?? ''}`,
    )
    throw err
  }
}

export async function sendWhatsApp({ to, body }: { to: string; body: string }) {
  const formatted = formatE164FR(to.trim())
  console.log('[twilio] sendWhatsApp — to (raw):', to, '→ (E.164):', formatted, '| from:', WA_PHONE ?? '(undefined)')

  try {
    const msg = await getClient().messages.create({
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
