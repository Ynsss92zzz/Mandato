'use client'

import { useState, useTransition } from 'react'
import { createLead, updateLead } from '@/actions/leads'
import type { Database } from '@/types/database'
import type { LeadStatus, LeadSource } from '@/types'

type Lead = Database['public']['Tables']['leads']['Row']

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'manuel', label: 'Manuel' },
  { value: 'widget', label: 'Widget' },
  { value: 'seloger', label: 'SeLoger' },
  { value: 'leboncoin', label: 'Leboncoin' },
  { value: 'logicimmo', label: 'Logic Immo' },
  { value: 'import', label: 'Import' },
  { value: 'autre', label: 'Autre' },
]

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'contacte', label: 'Contacté' },
  { value: 'qualifie', label: 'Qualifié' },
  { value: 'rdv_planifie', label: 'RDV planifié' },
  { value: 'proposition', label: 'Proposition' },
  { value: 'gagne', label: 'Gagné' },
  { value: 'perdu', label: 'Perdu' },
]

interface LeadFormProps {
  lead?: Lead
  onSuccess: () => void
  onClose: () => void
}

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 focus:ring-2 focus:ring-[#1B2B4B]/10 transition-colors'
const labelCls = 'block text-xs font-medium text-zinc-600 mb-1'

export function LeadForm({ lead, onSuccess, onClose }: LeadFormProps) {
  const isEdit = !!lead
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEdit
        ? await updateLead(lead.id, formData)
        : await createLead(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-semibold text-[#1B2B4B]">
            {isEdit ? 'Modifier le lead' : 'Nouveau lead'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Identité */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prénom *</label>
              <input
                name="first_name"
                type="text"
                required
                defaultValue={lead?.first_name ?? ''}
                placeholder="Jean"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Nom</label>
              <input
                name="last_name"
                type="text"
                defaultValue={lead?.last_name ?? ''}
                placeholder="Dupont"
                className={inputCls}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input
                name="email"
                type="email"
                defaultValue={lead?.email ?? ''}
                placeholder="jean@exemple.fr"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input
                name="phone"
                type="tel"
                defaultValue={lead?.phone ?? ''}
                placeholder="06 12 34 56 78"
                className={inputCls}
              />
            </div>
          </div>

          {/* Source + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Source</label>
              <select name="source" defaultValue={lead?.source ?? 'manuel'} className={inputCls}>
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className={labelCls}>Statut</label>
                <select name="status" defaultValue={lead.status} className={inputCls}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Projet */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Budget (€)</label>
              <input
                name="budget"
                type="number"
                min="0"
                step="1000"
                defaultValue={lead?.budget ?? ''}
                placeholder="250000"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Type de bien</label>
              <input
                name="property_type"
                type="text"
                defaultValue={lead?.property_type ?? ''}
                placeholder="Appartement T3"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Localisation souhaitée</label>
            <input
              name="location_desired"
              type="text"
              defaultValue={lead?.location_desired ?? ''}
              placeholder="Paris 15e, banlieue nord..."
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Message du lead</label>
            <textarea
              name="message"
              rows={3}
              defaultValue={lead?.message ?? ''}
              placeholder="Recherche un appartement de 3 pièces..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {isEdit && (
            <div>
              <label className={labelCls}>Notes internes</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={lead?.notes ?? ''}
                placeholder="Notes visibles uniquement par votre équipe..."
                className={`${inputCls} resize-none`}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#FF8C5A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
