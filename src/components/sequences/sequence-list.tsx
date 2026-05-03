'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSequenceStatus, deleteSequence } from '@/actions/sequences'
import type { Database } from '@/types/database'

type Sequence = Database['public']['Tables']['sequences']['Row']
type SequenceStatus = 'actif' | 'pause' | 'archive'

const STATUS_CONFIG: Record<SequenceStatus, { label: string; color: string; dot: string }> = {
  actif: { label: 'Actif', color: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
  pause: { label: 'En pause', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  archive: { label: 'Archivé', color: 'bg-zinc-100 text-zinc-500', dot: 'bg-zinc-300' },
}

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: 'Nouveau lead',
  lead_qualified: 'Lead qualifié',
  no_response_48h: 'Sans réponse 48h',
  no_response_7d: 'Sans réponse 7j',
  manual: 'Manuel',
}

interface SequenceWithCount extends Sequence {
  stepCount?: number
}

export function SequenceList({ sequences }: { sequences: SequenceWithCount[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleTogglePause(seq: SequenceWithCount) {
    const newStatus: SequenceStatus = seq.status === 'actif' ? 'pause' : 'actif'
    startTransition(async () => {
      await updateSequenceStatus(seq.id, newStatus)
      router.refresh()
    })
  }

  function handleDelete(seq: SequenceWithCount) {
    startTransition(async () => {
      await deleteSequence(seq.id)
      setDeletingId(null)
      router.refresh()
    })
  }

  if (sequences.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-navy-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-navy/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h7m3 4l3-3m0 0l3 3m-3-3v8" />
          </svg>
        </div>
        <p className="text-sm font-medium text-navy mb-1">Aucune séquence</p>
        <p className="text-xs text-zinc-400 mb-5">Créez votre première séquence de relances automatiques</p>
        <button
          onClick={() => router.push('/sequences/new')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange rounded-lg hover:bg-orange-light transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer une séquence
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sequences.map((seq) => {
        const status = seq.status as SequenceStatus
        const cfg = STATUS_CONFIG[status]

        return (
          <div
            key={seq.id}
            className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <h3 className="text-base font-semibold text-navy truncate">{seq.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                  <span>
                    🎯 {TRIGGER_LABELS[seq.trigger_on] ?? seq.trigger_on}
                  </span>
                  {seq.stepCount !== undefined && (
                    <span>
                      📋 {seq.stepCount} étape{seq.stepCount > 1 ? 's' : ''}
                    </span>
                  )}
                  <span>
                    Créée le {new Date(seq.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-none">
                <button
                  onClick={() => router.push(`/sequences/${seq.id}`)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Modifier
                </button>

                <button
                  onClick={() => handleTogglePause(seq)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    status === 'actif'
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'text-green-700 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {status === 'actif' ? 'Mettre en pause' : 'Activer'}
                </button>

                <button
                  onClick={() => setDeletingId(seq.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-navy mb-2">Supprimer la séquence ?</h3>
            <p className="text-sm text-zinc-500 mb-5">
              Toutes les étapes et inscriptions associées seront supprimées. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
                Annuler
              </button>
              <button
                onClick={() => handleDelete(sequences.find((s) => s.id === deletingId)!)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
