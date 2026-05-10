'use client'

import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'
import type { LeadStatus, LeadSource } from '@/types'

type Lead = Database['public']['Tables']['leads']['Row']

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  nouveau: { label: 'Nouveau', color: 'bg-blue-100 text-blue-700' },
  contacte: { label: 'Contacté', color: 'bg-amber-100 text-amber-700' },
  qualifie: { label: 'Qualifié', color: 'bg-purple-100 text-purple-700' },
  rdv_planifie: { label: 'RDV planifié', color: 'bg-indigo-100 text-indigo-700' },
  proposition: { label: 'Proposition', color: 'bg-[#FF6B35]-100 text-[#FF6B35]-700' },
  gagne: { label: 'Gagné', color: 'bg-green-100 text-green-700' },
  perdu: { label: 'Perdu', color: 'bg-red-100 text-red-700' },
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  widget: 'Widget',
  manuel: 'Manuel',
  seloger: 'SeLoger',
  leboncoin: 'Leboncoin',
  logicimmo: 'Logic Immo',
  import: 'Import',
  autre: 'Autre',
}

function getInitials(firstName: string, lastName: string | null) {
  return `${firstName[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-300 text-sm">—</span>
  const color =
    score >= 7 ? 'text-green-600 bg-green-50' :
    score >= 4 ? 'text-amber-600 bg-amber-50' :
    'text-red-600 bg-red-50'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {score}/10
    </span>
  )
}

export function LeadList({
  leads,
  onEdit,
  showHot = false,
}: {
  leads: Lead[]
  onEdit: (lead: Lead) => void
  showHot?: boolean
}) {
  const router = useRouter()

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-xl border border-zinc-200">
        <svg className="w-10 h-10 text-zinc-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm font-medium text-[#1B2B4B]">Aucun lead</p>
        <p className="text-xs text-zinc-400 mt-1">Ajoutez votre premier lead pour commencer</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Lead</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Source</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Score IA</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Budget</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ajouté</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {leads.map((lead) => {
              const status = lead.status as LeadStatus
              const source = lead.source as LeadSource
              const statusCfg = STATUS_CONFIG[status]

              const isHot = showHot && (lead.ai_score ?? 0) > 7
              return (
                <tr
                  key={lead.id}
                  className={`transition-colors cursor-pointer ${isHot ? 'bg-orange-50/40 hover:bg-orange-50' : 'hover:bg-zinc-50/50'}`}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-none ${isHot ? 'bg-orange-100' : 'bg-[#1B2B4B]/10'}`}>
                        <span className={`text-xs font-semibold ${isHot ? 'text-orange-700' : 'text-[#1B2B4B]'}`}>
                          {getInitials(lead.first_name, lead.last_name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1B2B4B] truncate">
                          {isHot && <span className="mr-1">🔥</span>}{lead.first_name} {lead.last_name ?? ''}
                        </p>
                        {lead.location_desired && (
                          <p className="text-xs text-zinc-400 truncate">{lead.location_desired}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs space-y-0.5">
                      {lead.email && <p className="text-zinc-600 truncate max-w-[160px]">{lead.email}</p>}
                      {lead.phone && <p className="text-zinc-400">{lead.phone}</p>}
                      {!lead.email && !lead.phone && <span className="text-zinc-300">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-500">{SOURCE_LABELS[source]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCell score={lead.ai_score} />
                  </td>
                  <td className="px-4 py-3">
                    {lead.budget
                      ? <span className="text-sm text-zinc-600">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(lead.budget)}
                        </span>
                      : <span className="text-zinc-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-400">
                      {new Date(lead.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit(lead)}
                      className="text-xs text-zinc-400 hover:text-[#1B2B4B] px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                      title="Modifier"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
        <p className="text-xs text-zinc-400">{leads.length} lead{leads.length > 1 ? 's' : ''} au total</p>
      </div>
    </div>
  )
}
