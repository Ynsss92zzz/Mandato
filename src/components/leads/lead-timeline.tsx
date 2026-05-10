import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Lead = Database['public']['Tables']['leads']['Row']

const CHANNEL_CONFIG: Record<string, { icon: string; label: string }> = {
  email: { icon: '📧', label: 'Email' },
  sms: { icon: '💬', label: 'SMS' },
  whatsapp: { icon: '💚', label: 'WhatsApp' },
  note: { icon: '📝', label: 'Note interne' },
}

const SOURCE_LABELS: Record<string, string> = {
  widget: 'Widget', seloger: 'SeLoger', leboncoin: 'Leboncoin',
  logicimmo: 'Logic-Immo', manuel: 'Manuel', import: 'Import', autre: 'Autre',
}

interface TimelineEvent {
  key: string
  at: Date
  icon: string
  title: string
  sub?: string
  dot: string
}

function formatAt(d: Date): string {
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return "à l'instant"
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)}h`
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('fr-FR', opts)
}

export async function LeadTimeline({ lead }: { lead: Lead }) {
  const supabase = await createClient()

  const [{ data: messages }, { data: appointments }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, channel, direction, content, sent_at, created_at')
      .eq('lead_id', lead.id)
      .order('sent_at', { ascending: true }),
    supabase
      .from('appointments')
      .select('id, title, status, scheduled_at')
      .eq('lead_id', lead.id)
      .order('scheduled_at', { ascending: true }),
  ])

  const events: TimelineEvent[] = []

  // Lead created
  events.push({
    key: 'created',
    at: new Date(lead.created_at),
    icon: '🟢',
    title: 'Lead créé',
    sub: SOURCE_LABELS[lead.source] ?? lead.source,
    dot: 'border-green-400 bg-green-50',
  })

  // Messages
  for (const msg of messages ?? []) {
    const at = msg.sent_at ? new Date(msg.sent_at) : new Date(msg.created_at)
    const cfg = CHANNEL_CONFIG[msg.channel] ?? { icon: '💬', label: msg.channel }
    const isIn = msg.direction === 'entrant'
    events.push({
      key: msg.id,
      at,
      icon: cfg.icon,
      title: `${cfg.label} ${isIn ? 'reçu' : 'envoyé'}`,
      sub: msg.content.length > 100 ? msg.content.slice(0, 100) + '…' : msg.content,
      dot: isIn ? 'border-blue-400 bg-blue-50' : 'border-zinc-300 bg-zinc-50',
    })
  }

  // Appointments
  for (const appt of appointments ?? []) {
    const done = appt.status === 'effectue'
    const cancelled = appt.status === 'annule'
    events.push({
      key: appt.id,
      at: new Date(appt.scheduled_at),
      icon: done ? '✅' : cancelled ? '❌' : '📅',
      title: `RDV : ${appt.title}`,
      sub: done ? 'Effectué' : cancelled ? 'Annulé' : 'Planifié',
      dot: done ? 'border-green-500 bg-green-50' : cancelled ? 'border-red-400 bg-red-50' : 'border-indigo-400 bg-indigo-50',
    })
  }

  // AI qualification
  if (lead.ai_score !== null) {
    const scoreEmoji = lead.ai_score >= 8 ? '🔥' : lead.ai_score >= 5 ? '🤖' : '🤖'
    events.push({
      key: 'ai-qualified',
      at: new Date(lead.updated_at),
      icon: scoreEmoji,
      title: `Qualifié par IA — Score ${lead.ai_score}/10`,
      dot: 'border-purple-400 bg-purple-50',
    })
  }

  // Won (mandat signé)
  if (lead.status === 'gagne') {
    events.push({
      key: 'won',
      at: new Date(lead.updated_at),
      icon: '🏆',
      title: 'Mandat signé — Lead gagné',
      dot: 'border-green-600 bg-green-100',
    })
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime())

  if (events.length <= 1) return null

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <h2 className="text-sm font-semibold text-[#1B2B4B] mb-5">
        Timeline{' '}
        <span className="text-zinc-400 font-normal text-xs">
          {events.length} événement{events.length > 1 ? 's' : ''}
        </span>
      </h2>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-4 bottom-2 w-px bg-zinc-100" />

        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.key} className="flex items-start gap-4">
              {/* Icon dot */}
              <div
                className={`relative z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center flex-none text-xs ${event.dot}`}
              >
                {event.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-sm font-medium text-[#1B2B4B] leading-tight">{event.title}</p>
                  <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0">
                    {formatAt(event.at)}
                  </span>
                </div>
                {event.sub && (
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed truncate max-w-lg">
                    {event.sub}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
