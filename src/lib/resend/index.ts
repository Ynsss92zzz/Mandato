import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@mandato.fr'

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html?: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html: html ?? `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">${text.replace(/\n/g, '<br>')}</div>`,
    text,
  })
}
