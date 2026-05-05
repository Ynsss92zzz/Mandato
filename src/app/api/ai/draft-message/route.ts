import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { draftMessage } from '@/lib/ai/draft-message'
import type { MessageChannel } from '@/types'

// Replaces any leftover bracket placeholders with real values when available,
// leaving them intact if the value is missing (so the agent knows to fill them).
function fillPlaceholders(message: string, data: {
  agencyName?: string | null
  agencyPhone?: string | null
  agencyAddress?: string | null
  agentFullName?: string | null
  agentEmail?: string | null
}): string {
  const [firstName = '', ...rest] = (data.agentFullName ?? '').split(' ')
  const lastName = rest.join(' ')

  const replacements: Array<[string, string | null | undefined]> = [
    ['[Votre Prénom]',         firstName || null],
    ['[Votre Nom]',            lastName  || null],
    ['[Nom de l\'agence]',     data.agencyName],
    ['[Téléphone]',            data.agencyPhone],
    ['[Email]',                data.agentEmail],
    ['[Adresse de l\'agence]', data.agencyAddress],
  ]

  return replacements.reduce(
    (msg, [placeholder, value]) =>
      value ? msg.replaceAll(placeholder, value) : msg,
    message,
  )
}

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

  // Fetch lead + agency + profile in parallel
  const [
    { data: lead },
    { data: member },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('first_name, last_name, ai_analysis')
      .eq('id', lead_id)
      .single(),
    supabase
      .from('agency_members')
      .select('agency_id')
      .eq('profile_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single(),
  ])

  if (!lead) {
    return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  }

  // Fetch agency data (needs agency_id from member)
  const { data: agency } = member?.agency_id
    ? await supabase
        .from('agencies')
        .select('name, phone, address')
        .eq('id', member.agency_id)
        .single()
    : { data: null }

  const agentContext = {
    fullName:      profile?.full_name ?? null,
    email:         profile?.email     ?? user.email ?? null,
    agencyName:    agency?.name       ?? null,
    agencyPhone:   agency?.phone      ?? null,
    agencyAddress: agency?.address    ?? null,
  }

  let message: string
  try {
    message = await draftMessage({
      lead: {
        first_name:  lead.first_name,
        last_name:   lead.last_name,
        ai_analysis: lead.ai_analysis as Parameters<typeof draftMessage>[0]['lead']['ai_analysis'],
      },
      channel,
      context,
      agentName:    agent_name ?? agentContext.fullName ?? undefined,
      agentContext,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }

  // Belt-and-suspenders: replace any placeholders the AI still left in
  message = fillPlaceholders(message, {
    agencyName:    agentContext.agencyName,
    agencyPhone:   agentContext.agencyPhone,
    agencyAddress: agentContext.agencyAddress,
    agentFullName: agentContext.fullName,
    agentEmail:    agentContext.email,
  })

  return NextResponse.json({ message })
}
