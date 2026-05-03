'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { sendSMS, sendWhatsApp } from '@/lib/twilio'
import type { MessageChannel } from '@/types'

async function getAgencyId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', userId)
    .single()
  return data?.agency_id ?? null
}

export async function sendMessage({
  leadId,
  channel,
  content,
  subject,
  conversationId: existingConvId,
}: {
  leadId: string
  channel: MessageChannel
  content: string
  subject?: string
  conversationId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  if (!content.trim()) return { error: 'Le message ne peut pas être vide' }

  // Find or create conversation
  let conversationId = existingConvId
  if (!conversationId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .eq('channel', channel)
      .maybeSingle()

    if (existing) {
      conversationId = existing.id
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ agency_id: agencyId, lead_id: leadId, channel })
        .select('id')
        .single()
      if (convError) return { error: convError.message }
      conversationId = newConv.id
    }
  }

  // Send via external channel
  if (channel !== 'note') {
    const { data: lead } = await supabase
      .from('leads')
      .select('email, phone, first_name, last_name')
      .eq('id', leadId)
      .single()

    if (lead) {
      try {
        if (channel === 'email' && lead.email) {
          await sendEmail({
            to: lead.email,
            subject: subject ?? 'Message de votre conseiller immobilier',
            text: content,
          })
        } else if (channel === 'sms' && lead.phone) {
          await sendSMS({ to: lead.phone, body: content })
        } else if (channel === 'whatsapp' && lead.phone) {
          await sendWhatsApp({ to: lead.phone, body: content })
        }
      } catch (err) {
        console.error(`[sendMessage] channel=${channel} error:`, err)
      }
    }
  }

  const now = new Date().toISOString()

  // Save message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      agency_id: agencyId,
      conversation_id: conversationId,
      lead_id: leadId,
      sender_id: user.id,
      channel,
      direction: 'sortant',
      content: content.trim(),
      subject: subject ?? null,
      is_ai_generated: false,
      status: 'sent',
      sent_at: now,
    })
    .select()
    .single()

  if (msgError) return { error: msgError.message }

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ last_message_at: now })
    .eq('id', conversationId)

  revalidatePath('/conversations')
  return { message, conversationId }
}
