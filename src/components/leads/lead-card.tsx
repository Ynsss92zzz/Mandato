'use client'

import type { Database } from '@/types/database'
import type { LeadSource } from '@/types'

type Lead = Database['public']['Tables']['leads']['Row']

const SOURCE_LABELS: Record<LeadSource, string> = {
  widget: 'Widget',
  manuel: 'Manuel',
  seloger: 'SeLoger',
  leboncoin: 'Leboncoin',
  logicimmo: 'Logic Immo',
  import: 'Import',
  autre: 'Autre',
}

const SOURCE_COLORS: Record<LeadSource, string> = {
  widget: 'bg-blue-100 text-blue-700',
  manuel: 'bg-zinc-100 text-zinc-600',
  seloger: 'bg-green-100 text-green-700',
  leboncoin: 'bg-[#FF6B35]-100 text-[#FF6B35]-700',
  logicimmo: 'bg-purple-100 text-purple-700',
  import: 'bg-amber-100 text-amber-700',
  autre: 'bg-zinc-100 text-zinc-500',
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const color =
    score >= 7 ? 'bg-green-100 text-green-700' :
    score >= 4 ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700'
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>
      {score}/10
    </span>
  )
}

export function LeadCard({
  lead,
  onDragStart,
  onClick,
  showHot = false,
}: {
  lead: Lead
  onDragStart: (e: React.DragEvent, leadId: string) => void
  onClick: (lead: Lead) => void
  showHot?: boolean
}) {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
  const source = lead.source as LeadSource
  const isHot = showHot && (lead.ai_score ?? 0) > 7

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onClick(lead)}
      className={`bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none group ${
        isHot
          ? 'border-orange-300 ring-1 ring-orange-200 hover:border-orange-400'
          : 'border-zinc-200 hover:border-[#1B2B4B]/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-[#1B2B4B] truncate leading-tight">
          {isHot && <span className="mr-1">🔥</span>}{fullName}
        </p>
        <ScoreBadge score={lead.ai_score} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SOURCE_COLORS[source]}`}>
          {SOURCE_LABELS[source]}
        </span>
        {lead.budget && (
          <span className="text-xs text-zinc-500 font-medium">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(lead.budget)}
          </span>
        )}
      </div>

      {(lead.email || lead.phone) && (
        <p className="text-xs text-zinc-400 truncate">
          {lead.email ?? lead.phone}
        </p>
      )}

      <p className="text-xs text-zinc-300 mt-1.5">
        {new Date(lead.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
      </p>
    </div>
  )
}
