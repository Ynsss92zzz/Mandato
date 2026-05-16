'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildAgentFromAddress } from '@/lib/resend'
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

  // Fetch sender's full name for the email From header
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const emailFrom = buildAgentFromAddress(senderProfile?.full_name)

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

    console.log(`[sendMessage] channel=${channel} | lead email=${lead?.email ?? 'null'} | phone=${lead?.phone ?? 'null'}`)

    if (lead) {
      try {
        if (channel === 'email') {
          if (lead.email) {
            console.log('[sendMessage] calling sendEmail →', lead.email, '| from:', emailFrom)
            await sendEmail({
              to: lead.email,
              subject: subject ?? 'Message de votre conseiller immobilier',
              text: content,
              from: emailFrom,
            })
            console.log('[sendMessage] sendEmail done')
          } else {
            console.warn('[sendMessage] email channel but lead has no email')
          }
        } else if (channel === 'sms') {
          if (lead.phone) {
            console.log('[sendMessage] calling sendSMS →', lead.phone)
            await sendSMS({ to: lead.phone, body: content })
            console.log('[sendMessage] sendSMS done')
          } else {
            console.warn('[sendMessage] sms channel but lead has no phone')
          }
        } else if (channel === 'whatsapp') {
          if (lead.phone) {
            console.log('[sendMessage] calling sendWhatsApp →', lead.phone)
            await sendWhatsApp({ to: lead.phone, body: content })
            console.log('[sendMessage] sendWhatsApp done')
          } else {
            console.warn('[sendMessage] whatsapp channel but lead has no phone')
          }
        }
      } catch (err) {
        console.error(`[sendMessage] channel=${channel} threw:`, err instanceof Error ? err.message : JSON.stringify(err))
      }
    } else {
      console.warn('[sendMessage] lead not found for id:', leadId)
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
