import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Diagnostic endpoint — requires same Bearer token as cron
// GET /api/debug/conversations
// Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const [
    { data: agencies },
    { data: conversations, error: convErr },
    { data: messages, error: msgErr },
    { data: recentMessages },
  ] = await Promise.all([
    supabase.from('agencies').select('id, name'),

    supabase
      .from('conversations')
      .select('id, agency_id, lead_id, channel, last_message_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('messages')
      .select('id, agency_id, conversation_id, lead_id, channel, direction, status, is_ai_generated, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(1),

    supabase
      .from('messages')
      .select('id, agency_id, conversation_id, channel, direction, status, subject, content, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Count messages per agency
  const agencyIds = (agencies ?? []).map(a => a.id)
  const messageCounts: Record<string, number> = {}
  const convCounts: Record<string, number> = {}

  for (const agId of agencyIds) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agId)
    messageCounts[agId] = count ?? 0

    const { count: cc } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agId)
    convCounts[agId] = cc ?? 0
  }

  return NextResponse.json({
    errors: {
      conversations: convErr?.message ?? null,
      messages: msgErr?.message ?? null,
    },
    summary: {
      total_conversations: conversations?.length ?? 0,
      total_messages_last20: recentMessages?.length ?? 0,
    },
    per_agency: (agencies ?? []).map(a => ({
      id: a.id,
      name: a.name,
      conversations: convCounts[a.id] ?? 0,
      messages: messageCounts[a.id] ?? 0,
    })),
    conversations: (conversations ?? []).map(c => ({
      id: c.id,
      agency_id: c.agency_id,
      lead_id: c.lead_id,
      channel: c.channel,
      last_message_at: c.last_message_at,
      created_at: c.created_at,
    })),
    recent_messages: (recentMessages ?? []).map(m => ({
      id: m.id,
      agency_id: m.agency_id,
      conversation_id: m.conversation_id,
      channel: m.channel,
      direction: m.direction,
      status: m.status,
      subject: m.subject ?? null,
      content_preview: (m.content ?? '').slice(0, 100),
      created_at: m.created_at,
    })),
  })
}
