'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/actions/messages'
import type { Database } from '@/types/database'
import type { MessageChannel } from '@/types'

type Message = Database['public']['Tables']['messages']['Row']

interface ConversationSummary {
  id: string
  lead_id: string
  channel: MessageChannel
  last_message_at: string
  leadName: string
  leadEmail: string | null
  leadPhone: string | null
}

const CHANNEL_ICONS: Record<MessageChannel, string> = {
  email: '✉️',
  sms: '💬',
  whatsapp: '📱',
  note: '📝',
}

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  note: 'Note',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'sortant'
  const isNote = message.channel === 'note'

  if (isNote) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 max-w-[80%]">
          <p className="text-xs font-medium text-amber-700 mb-0.5">📝 Note interne</p>
          <p className="text-sm text-amber-800 leading-relaxed">{message.content}</p>
          <p className="text-xs text-amber-400 mt-1">
            {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex mb-3 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isOutbound
          ? 'bg-[#1B2B4B] text-white rounded-br-sm'
          : 'bg-white border border-zinc-200 text-[#1B2B4B] rounded-bl-sm'
      }`}>
        {message.subject && (
          <p className={`text-xs font-semibold mb-1 ${isOutbound ? 'text-white/70' : 'text-zinc-500'}`}>
            {message.subject}
          </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <div className={`flex items-center gap-1.5 mt-1 ${isOutbound ? 'justify-end' : ''}`}>
          {message.is_ai_generated && (
            <span className={`text-xs font-medium ${isOutbound ? 'text-white/50' : 'text-[#FF6B35]'}`}>✦ IA</span>
          )}
          <span className={`text-xs ${isOutbound ? 'text-white/50' : 'text-zinc-400'}`}>
            {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

function ConversationThread({
  conversation,
}: {
  conversation: ConversationSummary
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [subject, setSubject] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, startSend] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  const ch = conversation.channel

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? [])
        setLoading(false)
      })
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!content.trim()) return
    setSendError(null)
    startSend(async () => {
      const result = await sendMessage({
        leadId: conversation.lead_id,
        channel: ch,
        content: content.trim(),
        subject: subject.trim() || undefined,
        conversationId: conversation.id,
      })
      if (result?.error) {
        setSendError(result.error)
      } else if (result?.message) {
        setMessages((prev) => [...prev, result.message as Message])
        setContent('')
        setSubject('')
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-5 py-3 border-b border-zinc-100 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CHANNEL_ICONS[ch]}</span>
          <div>
            <p className="text-sm font-semibold text-[#1B2B4B]">{conversation.leadName}</p>
            <p className="text-xs text-zinc-400">{CHANNEL_LABELS[ch]}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-200 border-t-[#1B2B4B] rounded-full animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-zinc-400">Aucun message dans cette conversation</p>
          </div>
        )}
        {!loading && messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply form */}
      <div className="border-t border-zinc-100 px-5 py-4 bg-white">
        {ch === 'email' && (
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Sujet de l'email..."
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 mb-2"
          />
        )}
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={ch === 'note' ? 'Écrire une note interne...' : `Envoyer un ${CHANNEL_LABELS[ch].toLowerCase()}...`}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
            }}
            className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !content.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#FF6B35] rounded-xl hover:bg-[#FF8C5A] transition-colors disabled:opacity-50 flex-none self-end"
          >
            {isSending ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        {sendError && <p className="text-xs text-red-600 mt-1.5">{sendError}</p>}
        <p className="text-xs text-zinc-300 mt-1.5">⌘ + Entrée pour envoyer</p>
      </div>
    </div>
  )
}

export function ConversationView({ conversations }: { conversations: ConversationSummary[] }) {
  const [selected, setSelected] = useState<ConversationSummary | null>(
    conversations.length > 0 ? conversations[0] : null
  )
  const [search, setSearch] = useState('')

  const filtered = conversations.filter((c) =>
    c.leadName.toLowerCase().includes(search.toLowerCase()) ||
    (c.leadEmail ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Left panel — conversation list */}
      <div className="w-72 flex-none border-r border-zinc-100 flex flex-col">
        <div className="p-3 border-b border-zinc-100">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-[#1B2B4B]/50 text-[#1B2B4B] placeholder-zinc-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <p className="text-xs text-zinc-400">{search ? 'Aucun résultat' : 'Aucune conversation'}</p>
            </div>
          )}
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv)}
              className={`w-full px-3 py-3 text-left border-b border-zinc-50 hover:bg-zinc-50 transition-colors ${
                selected?.id === conv.id ? 'bg-[#f0f3f9] border-l-2 border-l-[#1B2B4B]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-none">{CHANNEL_ICONS[conv.channel]}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1B2B4B] truncate">{conv.leadName}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      {conv.leadEmail ?? conv.leadPhone ?? CHANNEL_LABELS[conv.channel]}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-zinc-300 flex-none whitespace-nowrap">
                  {timeAgo(conv.last_message_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — thread */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <ConversationThread key={selected.id} conversation={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
