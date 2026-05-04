'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LeadCard } from './lead-card'
import { updateLeadStatus } from '@/actions/leads'
import type { Database } from '@/types/database'
import type { LeadStatus } from '@/types'

type Lead = Database['public']['Tables']['leads']['Row']

const COLUMNS: { status: LeadStatus; label: string; dotColor: string }[] = [
  { status: 'nouveau', label: 'Nouveau', dotColor: 'bg-blue-400' },
  { status: 'contacte', label: 'Contacté', dotColor: 'bg-amber-400' },
  { status: 'qualifie', label: 'Qualifié', dotColor: 'bg-purple-400' },
  { status: 'rdv_planifie', label: 'RDV planifié', dotColor: 'bg-indigo-400' },
  { status: 'proposition', label: 'Proposition', dotColor: 'bg-[#FF6B35]-400' },
  { status: 'gagne', label: 'Gagné', dotColor: 'bg-green-400' },
  { status: 'perdu', label: 'Perdu', dotColor: 'bg-red-400' },
]

export function LeadKanban({
  initialLeads,
  onEdit,
}: {
  initialLeads: Lead[]
  onEdit: (lead: Lead) => void
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = leads.filter((l) => l.status === col.status)
    return acc
  }, {} as Record<LeadStatus, Lead[]>)

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggedId(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStatus(null)
    }
  }

  function handleDrop(e: React.DragEvent, targetStatus: LeadStatus) {
    e.preventDefault()
    setDragOverStatus(null)
    if (!draggedId) return

    const lead = leads.find((l) => l.id === draggedId)
    if (!lead || lead.status === targetStatus) {
      setDraggedId(null)
      return
    }

    const previousStatus = lead.status as LeadStatus
    setLeads((prev) =>
      prev.map((l) => (l.id === draggedId ? { ...l, status: targetStatus } : l))
    )
    setDraggedId(null)

    startTransition(async () => {
      const result = await updateLeadStatus(draggedId, targetStatus)
      if (result?.error) {
        setLeads((prev) =>
          prev.map((l) => (l.id === draggedId ? { ...l, status: previousStatus } : l))
        )
      }
    })
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDragOverStatus(null)
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 bg-[#f0f3f9] rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#1B2B4B]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#1B2B4B]">Aucun lead pour le moment</p>
        <p className="text-xs text-zinc-400 mt-1">Ajoutez votre premier lead pour commencer</p>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
      {COLUMNS.map(({ status, label, dotColor }) => {
        const columnLeads = grouped[status]
        const isOver = dragOverStatus === status

        return (
          <div
            key={status}
            className={`flex-none w-60 flex flex-col rounded-xl border-2 transition-colors duration-150 ${
              isOver ? 'border-[#FF6B35] bg-[#FF6B35]/5' : 'border-transparent bg-[#f0f3f9]/60'
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
            onDragEnd={handleDragEnd}
          >
            <div className="px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                <h3 className="text-xs font-semibold text-[#1B2B4B] uppercase tracking-wide">{label}</h3>
              </div>
              <span className="text-xs text-zinc-400 font-medium bg-white px-1.5 py-0.5 rounded-full border border-zinc-200">
                {columnLeads.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
              {columnLeads.map((lead) => (
                <div
                  key={lead.id}
                  className={draggedId === lead.id ? 'opacity-40' : ''}
                >
                  <LeadCard
                    lead={lead}
                    onDragStart={handleDragStart}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  />
                </div>
              ))}

              {columnLeads.length === 0 && (
                <div className={`flex items-center justify-center h-20 rounded-lg border-2 border-dashed transition-colors ${
                  isOver ? 'border-[#FF6B35] text-[#FF6B35]' : 'border-zinc-200 text-zinc-300'
                }`}>
                  <p className="text-xs font-medium">Déposer ici</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
