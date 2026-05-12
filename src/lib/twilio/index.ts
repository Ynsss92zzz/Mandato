import twilio from 'twilio'

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN
const PHONE       = process.env.TWILIO_PHONE_NUMBER
const WA_PHONE    = process.env.TWILIO_WHATSAPP_NUMBER

console.log('[twilio] init — SID:', ACCOUNT_SID ?? '(undefined)', '| phone:', PHONE ?? '(undefined)', '| wa:', WA_PHONE ?? '(undefined)')

function getClient() {
  return twilio(ACCOUNT_SID!, AUTH_TOKEN!)
}

export async function sendSMS({ to, body }: { to: string; body: string }) {
  console.log('[twilio] sendSMS — to:', to, '| from:', PHONE)
  try {
    const msg = await getClient().messages.create({ from: PHONE!, to, body })
    console.log('[twilio] sendSMS ok — sid:', msg.sid, '| status:', msg.status)
    return msg
  } catch (err) {
    console.error('[twilio] sendSMS error:', err instanceof Error ? err.message : JSON.stringify(err))
    throw err
  }
}

export async function sendWhatsApp({ to, body }: { to: string; body: string }) {
  console.log('[twilio] sendWhatsApp — to:', to, '| from:', WA_PHONE)
  try {
    const msg = await getClient().messages.create({
      from: `whatsapp:${WA_PHONE!}`,
      to: `whatsapp:${to}`,
      body,
    })
    console.log('[twilio] sendWhatsApp ok — sid:', msg.sid, '| status:', msg.status)
    return msg
  } catch (err) {
    console.error('[twilio] sendWhatsApp error:', err instanceof Error ? err.message : JSON.stringify(err))
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
