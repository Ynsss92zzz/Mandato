import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
console.log('[resend] init — key:', apiKey ? `${apiKey.slice(0, 8)}…` : '(undefined)')

const resend = new Resend(apiKey)
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@mandato.fr'

/**
 * Builds a "Agency Name <noreply@mandato.fr>" from address using the verified sending domain.
 * "Dupont Immobilier" → "Dupont Immobilier <noreply@mandato.fr>"
 * null / empty        → "Mandato <noreply@mandato.fr>"
 */
export function buildAgencyFromAddress(agencyName: string | null | undefined): string {
  const display = agencyName?.trim() || 'Mandato'
  return `${display} <${DEFAULT_FROM}>`
}

/** @deprecated Use buildAgencyFromAddress instead */
export function buildAgentFromAddress(fullName: string | null | undefined): string {
  return buildAgencyFromAddress(fullName)
}

export async function sendEmail({
  to, subject, text, html, attachments, from,
}: {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: { filename: string; content: Buffer | string }[]
  from?: string
}) {
  const sender = from ?? DEFAULT_FROM
  console.log('[resend] sendEmail — to:', to, '| from:', sender, '| subject:', subject, '| attachments:', attachments?.length ?? 0)
  const result = await resend.emails.send({
    from: sender,
    to,
    subject,
    html: html ?? `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">${text.replace(/\n/g, '<br>')}</div>`,
    text,
    ...(attachments?.length ? { attachments: attachments.map(a => ({ filename: a.filename, content: a.content })) } : {}),
  })
  if (result.error) {
    const msg = (result.error as { message?: string }).message ?? JSON.stringify(result.error)
    console.error('[resend] sendEmail error:', msg, '| full:', JSON.stringify(result.error))
    throw new Error(`Resend error: ${msg}`)
  }
  console.log('[resend] sendEmail ok — id:', result.data?.id)
  return result
}

// ─── Booking emails ──────────────────────────────────────────────────────────

export async function sendBookingConfirmationToLead({
  to, leadName, agencyName, agentName, slotLabel, durationMin,
}: {
  to: string; leadName: string; agencyName: string; agentName: string
  slotLabel: string; durationMin: number
}) {
  const subject = `✅ Votre rendez-vous avec ${agencyName} est confirmé`
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f8fafc">
  <div style="background:#1B2B4B;padding:32px 40px;text-align:center">
    <span style="color:white;font-size:24px;font-weight:700;letter-spacing:-0.5px">Mandato</span>
  </div>
  <div style="background:white;padding:40px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <h1 style="color:#1B2B4B;font-size:22px;margin:0 0 8px">Bonjour ${leadName} 👋</h1>
    <p style="color:#64748b;margin:0 0 28px">Votre rendez-vous est confirmé !</p>

    <div style="background:#f0f3f9;border-radius:12px;padding:24px;margin-bottom:28px">
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">DÉTAILS DU RENDEZ-VOUS</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1B2B4B">📅 ${slotLabel}</p>
      <p style="margin:0 0 6px;color:#475569;font-size:14px">⏱ Durée : ${durationMin} minutes</p>
      <p style="margin:0;color:#475569;font-size:14px">👤 Avec : ${agentName} — ${agencyName}</p>
    </div>

    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px">
      Vous recevrez un rappel avant votre rendez-vous. En cas d'empêchement, contactez directement votre agent.
    </p>

    <p style="color:#94a3b8;font-size:12px;margin:0">
      Ce rendez-vous a été organisé via <strong>Mandato</strong> — la plateforme d'automatisation pour agents immobiliers.
    </p>
  </div>
</div>`

  return sendEmail({ to, subject, html, text: `${subject}\n\n${slotLabel} — ${durationMin} min avec ${agentName} (${agencyName})` })
}

export async function sendBookingNotificationToAgent({
  to, agentName, leadName, leadEmail, leadPhone, slotLabel, durationMin,
}: {
  to: string; agentName: string; leadName: string; leadEmail: string
  leadPhone: string | null; slotLabel: string; durationMin: number
}) {
  const subject = `📅 Nouveau RDV : ${leadName} — ${slotLabel}`
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f8fafc">
  <div style="background:#1B2B4B;padding:32px 40px;text-align:center">
    <span style="color:white;font-size:24px;font-weight:700;letter-spacing:-0.5px">Mandato</span>
  </div>
  <div style="background:white;padding:40px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <h1 style="color:#1B2B4B;font-size:22px;margin:0 0 8px">Nouveau rendez-vous 🎉</h1>
    <p style="color:#64748b;margin:0 0 28px">Bonjour ${agentName}, un prospect vient de réserver un créneau.</p>

    <div style="background:#fff4f0;border:1px solid #ffdecc;border-radius:12px;padding:24px;margin-bottom:28px">
      <p style="margin:0 0 8px;font-size:13px;color:#FF6B35;text-transform:uppercase;letter-spacing:.05em;font-weight:600">INFOS DU PROSPECT</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1B2B4B">👤 ${leadName}</p>
      <p style="margin:0 0 6px;color:#475569;font-size:14px">✉️ ${leadEmail}</p>
      ${leadPhone ? `<p style="margin:0;color:#475569;font-size:14px">📱 ${leadPhone}</p>` : ''}
    </div>

    <div style="background:#f0f3f9;border-radius:12px;padding:24px;margin-bottom:28px">
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">DÉTAILS DU RDV</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1B2B4B">📅 ${slotLabel}</p>
      <p style="margin:0;color:#475569;font-size:14px">⏱ Durée : ${durationMin} minutes</p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'}/appointments"
       style="display:inline-block;background:#FF6B35;color:white;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;font-size:14px">
      Voir le rendez-vous →
    </a>
  </div>
</div>`

  return sendEmail({ to, subject, html, text: `Nouveau RDV : ${leadName} (${leadEmail}) le ${slotLabel}` })
}
