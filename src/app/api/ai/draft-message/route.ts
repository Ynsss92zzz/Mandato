import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { draftMessage } from '@/lib/ai/draft-message'
import type { MessageChannel } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = await request.json() as {
    lead_id?: string
    channel?: MessageChannel
    context?: string
    agent_name?: string
  }

  const { lead_id, channel, context, agent_name } = body

  if (!lead_id || !channel) {
    return NextResponse.json({ error: 'lead_id et channel requis' }, { status: 400 })
  }

  const VALID_CHANNELS: MessageChannel[] = ['email', 'sms', 'whatsapp', 'note']
  if (!VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: 'Canal invalide' }, { status: 400 })
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('first_name, last_name, ai_analysis')
    .eq('id', lead_id)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  }

  let message: string
  try {
    message = await draftMessage({
      lead: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        ai_analysis: lead.ai_analysis as Parameters<typeof draftMessage>[0]['lead']['ai_analysis'],
      },
      channel,
      context,
      agentName: agent_name,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }

  return NextResponse.json({ message })
}
