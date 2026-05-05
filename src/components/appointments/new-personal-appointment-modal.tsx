'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, AlertCircle, Calendar } from 'lucide-react'
import { createPersonalAppointment } from '@/actions/appointments'

const CATEGORIES = [
  { value: 'reunion_interne', label: 'Réunion interne' },
  { value: 'visite_terrain', label: 'Visite terrain' },
  { value: 'formation',      label: 'Formation' },
  { value: 'autre',          label: 'Autre' },
] as const

const DURATIONS = [15, 30, 45, 60, 90, 120]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function nowTimeStr() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.toTimeString().slice(0, 5)
}

export function NewPersonalAppointmentModal() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createPersonalAppointment(fd)
      if ('error' in result) {
        setError(result.error)
      } else {
        setOpen(false)
        formRef.current?.reset()
        router.refresh()
      }
    })
  }

  function handleClose() {
    if (pending) return
    setOpen(false)
    setError(null)
    formRef.current?.reset()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Nouveau RDV personnel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#fff4f0] rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#FF6B35]" />
                </div>
                <h2 className="font-semibold text-zinc-800">Nouveau RDV personnel</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={pending}
                className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-none mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Titre */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Titre *
                </label>
                <input
                  name="title"
                  required
                  placeholder="Ex : Réunion agence Paris 8e"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Type *
                </label>
                <select
                  name="category"
                  required
                  defaultValue=""
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] bg-white"
                >
                  <option value="" disabled>Choisir un type…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Date + Heure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">Date *</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={todayStr()}
                    min={todayStr()}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">Heure *</label>
                  <input
                    name="time"
                    type="time"
                    required
                    defaultValue={nowTimeStr()}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Durée</label>
                <div className="flex gap-2 flex-wrap">
                  {DURATIONS.map((d, i) => (
                    <label key={d} className="cursor-pointer">
                      <input
                        type="radio"
                        name="duration_min"
                        value={d}
                        defaultChecked={i === 3}
                        className="sr-only peer"
                      />
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors border-zinc-200 text-zinc-500 peer-checked:bg-[#1B2B4B] peer-checked:text-white peer-checked:border-[#1B2B4B] hover:border-zinc-400">
                        {d} min
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Notes <span className="text-zinc-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Ordre du jour, adresse, participants…"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#FF8C5A] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {pending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Création…</>
                    : 'Créer le RDV'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
