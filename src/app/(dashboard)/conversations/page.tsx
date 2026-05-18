import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ConversationView } from '@/components/conversations/conversation-view'
import type { MessageChannel } from '@/types'

export const metadata: Metadata = { title: 'Conversations — Mandato' }

export default async function ConversationsPage() {
  const supabase = await createClient()

  // Verify session — helps diagnose RLS failures
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[conversations page] user:', user?.id ?? '(none — not authenticated)')

  // Fetch conversations with lead info
  const { data: conversations, error: convErr } = await supabase
    .from('conversations')
    .select('id, lead_id, channel, last_message_at, agency_id')
    .order('last_message_at', { ascending: false })

  console.log('[conversations page] conversations query —',
    'count:', conversations?.length ?? 0,
    '| error:', convErr?.message ?? 'none',
    '| user_id:', user?.id?.slice(0, 8) ?? '(none)',
  )

  if (convErr) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B] mb-6">Conversations</h1>
        <div className="bg-white rounded-xl border border-red-100 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-red-600 mb-1">Erreur de chargement</p>
          <p className="text-xs text-red-400 font-mono">{convErr.message}</p>
        </div>
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B] mb-6">Conversations</h1>
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[#f0f3f9] rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-[#1B2B4B]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#1B2B4B] mb-1">Aucune conversation</p>
          <p className="text-xs text-zinc-400">Les conversations apparaîtront ici lorsque vous enverrez ou recevrez des messages</p>
        </div>
      </div>
    )
  }

  // Fetch lead info + message counts for each conversation
  const convIds  = conversations.map((c) => c.id)
  const leadIds  = [...new Set(conversations.map((c) => c.lead_id))]

  const [{ data: leads }, { data: msgCounts }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone')
      .in('id', leadIds),
    // Count messages per conversation via a select with count
    supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds),
  ])

  const leadMap = Object.fromEntries((leads ?? []).map((l) => [l.id, l]))

  // Build message count map
  const msgCountMap: Record<string, number> = {}
  for (const m of (msgCounts ?? [])) {
    msgCountMap[m.conversation_id] = (msgCountMap[m.conversation_id] ?? 0) + 1
  }

  console.log('[conversations page] msg count map:', JSON.stringify(msgCountMap))

  const enriched = conversations.map((conv) => {
    const lead = leadMap[conv.lead_id]
    return {
      id: conv.id,
      lead_id: conv.lead_id,
      channel: conv.channel as MessageChannel,
      last_message_at: conv.last_message_at,
      leadName: lead ? `${lead.first_name} ${lead.last_name ?? ''}`.trim() : 'Lead inconnu',
      leadEmail: lead?.email ?? null,
      leadPhone: lead?.phone ?? null,
      messageCount: msgCountMap[conv.id] ?? 0,
    }
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Conversations</h1>
        <span className="text-sm text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full font-medium">
          {enriched.length}
        </span>
      </div>

      <ConversationView conversations={enriched} />
    </div>
  )
}
