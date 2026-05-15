'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateLeadStatus,
  updateLeadNotes,
  deleteLead,
  qualifyLeadWithAI,
} from '@/actions/leads'
import { LeadForm } from './lead-form'
import type { Database } from '@/types/database'
import type { LeadStatus, LeadSource, LeadAIAnalysis, MessageChannel, ProjectType } from '@/types'

type Lead = Database['public']['Tables']['leads']['Row'] & { project_type?: ProjectType | null }

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'contacte', label: 'Contacté' },
  { value: 'qualifie', label: 'Qualifié' },
  { value: 'rdv_planifie', label: 'RDV planifié' },
  { value: 'proposition', label: 'Proposition' },
  { value: 'gagne', label: 'Gagné' },
  { value: 'perdu', label: 'Perdu' },
]

const STATUS_COLORS: Record<LeadStatus, string> = {
  nouveau: 'bg-blue-100 text-blue-700',
  contacte: 'bg-amber-100 text-amber-700',
  qualifie: 'bg-purple-100 text-purple-700',
  rdv_planifie: 'bg-indigo-100 text-indigo-700',
  proposition: 'bg-[#FF6B35]-100 text-[#FF6B35]-700',
  gagne: 'bg-green-100 text-green-700',
  perdu: 'bg-red-100 text-red-700',
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

const URGENCE_LABELS: Record<string, string> = {
  '1_mois': 'Moins d\'1 mois',
  '3_mois': 'Dans 3 mois',
  '6_mois': 'Dans 6 mois',
  'plus_6_mois': 'Plus de 6 mois',
  'inconnu': 'Inconnue',
}

const INTENTION_LABELS: Record<string, string> = {
  achat: 'Achat',
  location: 'Location',
  vente: 'Vente',
  estimation: 'Estimation',
  inconnu: 'Inconnue',
}

const CHANNELS: { value: MessageChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'note', label: 'Note interne' },
]

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm text-[#1B2B4B]">{value}</p>
    </div>
  )
}

export function LeadDetail({ lead: initialLead }: { lead: Lead }) {
  const [lead, setLead] = useState<Lead>(initialLead)
  const [notesValue, setNotesValue] = useState(initialLead.notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [estimatedPrice, setEstimatedPrice] = useState(initialLead.budget ? String(initialLead.budget) : '')
  const [draftChannel, setDraftChannel] = useState<MessageChannel>('email')
  const [draftContext, setDraftContext] = useState('')
  const [draftedMessage, setDraftedMessage] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [isQualifying, startQualify] = useTransition()
  const [isSavingNotes, startNotes] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isDrafting, setIsDrafting] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const router = useRouter()

  const status = lead.status as LeadStatus
  const source = lead.source as LeadSource
  const aiAnalysis = lead.ai_analysis as LeadAIAnalysis | null

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as LeadStatus
    const previous = status
    setLead((prev) => ({ ...prev, status: newStatus }))
    startQualify(async () => {
      const result = await updateLeadStatus(lead.id, newStatus)
      if (result?.error) {
        setLead((prev) => ({ ...prev, status: previous }))
      }
    })
  }

  function handleSaveNotes() {
    setNotesSaved(false)
    startNotes(async () => {
      const result = await updateLeadNotes(lead.id, notesValue)
      if (!result?.error) {
        setNotesSaved(true)
        setTimeout(() => setNotesSaved(false), 2000)
      }
    })
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteLead(lead.id)
      if (!result?.error) {
        router.refresh()
        router.push('/leads')
      }
    })
  }

  function handleQualify() {
    setAiError(null)
    startQualify(async () => {
      const result = await qualifyLeadWithAI(lead.id)
      if (result?.error) {
        setAiError(result.error)
      } else if (result?.analysis) {
        setLead((prev) => ({
          ...prev,
          ai_score: result.analysis.score,
          ai_analysis: result.analysis as unknown as Lead['ai_analysis'],
        }))
      }
    })
  }

  async function handleDraftMessage() {
    setDraftError(null)
    setDraftedMessage(null)
    setIsDrafting(true)
    try {
      const res = await fetch('/api/ai/draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          channel: draftChannel,
          context: draftContext || undefined,
        }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (data.error) {
        setDraftError(data.error)
      } else if (data.message) {
        setDraftedMessage(data.message)
      }
    } catch {
      setDraftError('Erreur réseau')
    } finally {
      setIsDrafting(false)
    }
  }

  const scoreColor =
    lead.ai_score === null ? '' :
    lead.ai_score >= 7 ? 'text-green-600' :
    lead.ai_score >= 4 ? 'text-amber-600' :
    'text-red-600'

  const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const parsedPrice = estimatedPrice ? parseFloat(estimatedPrice.replace(/\s/g, '').replace(',', '.')) : NaN
  const commission = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice * 0.03 : null

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B2B4B]/10 flex items-center justify-center flex-none">
            <span className="text-base font-bold text-[#1B2B4B]">
              {lead.first_name[0]}{lead.last_name?.[0] ?? ''}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1B2B4B]">
              {lead.first_name} {lead.last_name ?? ''}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-zinc-400">{SOURCE_LABELS[source]}</span>
              <span className="text-zinc-200">·</span>
              <span className="text-xs text-zinc-400">
                {new Date(lead.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={handleStatusChange}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 ${STATUS_COLORS[status]}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowEditForm(true)}
            className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
          >
            Modifier
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 text-xs font-medium text-red-500 bg-white border border-zinc-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact info */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Informations de contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Téléphone" value={lead.phone} />
              <InfoRow label="Budget" value={lead.budget
                ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(lead.budget)
                : null
              } />
              <InfoRow label="Type de bien" value={lead.property_type} />
              <InfoRow label="Localisation souhaitée" value={lead.location_desired} />
              {lead.project_type && (
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Type de projet</p>
                  <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                    lead.project_type === 'achat' ? 'bg-blue-100 text-blue-700' :
                    lead.project_type === 'vente' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {{ achat: 'Achat', vente: 'Vente', location: 'Location' }[lead.project_type]}
                  </span>
                </div>
              )}
            </div>
            {lead.message && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <p className="text-xs text-zinc-400 mb-1">Message original</p>
                <p className="text-sm text-zinc-600 leading-relaxed">{lead.message}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1B2B4B]">Notes internes</h2>
              {notesSaved && (
                <span className="text-xs text-green-600 font-medium">✓ Enregistré</span>
              )}
            </div>
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Ajoutez des notes visibles uniquement par votre équipe..."
              rows={4}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 focus:ring-2 focus:ring-[#1B2B4B]/10 resize-none transition-colors"
            />
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-[#1B2B4B] rounded-lg hover:bg-[#2D4270] transition-colors disabled:opacity-60"
            >
              {isSavingNotes ? 'Enregistrement...' : 'Enregistrer les notes'}
            </button>
          </div>

          {/* Commission calculator */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Calculateur de commission</h2>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-xs text-zinc-400 mb-1.5 block">Prix de vente estimé (€)</label>
                <input
                  type="number"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  placeholder="Ex : 350 000"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 focus:ring-2 focus:ring-[#1B2B4B]/10 transition-colors"
                />
                {lead.budget && !estimatedPrice && (
                  <button
                    onClick={() => setEstimatedPrice(String(lead.budget))}
                    className="mt-1.5 text-xs text-[#FF6B35] hover:underline"
                  >
                    Utiliser le budget déclaré ({fmt.format(lead.budget)})
                  </button>
                )}
              </div>
              <div className="text-right shrink-0 pb-0.5">
                <p className="text-xs text-zinc-400 mb-0.5">Commission (3%)</p>
                {commission !== null ? (
                  <p className="text-2xl font-bold text-green-600">{fmt.format(commission)}</p>
                ) : (
                  <p className="text-2xl font-bold text-zinc-200">—</p>
                )}
              </div>
            </div>
          </div>

          {/* Draft message */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Rédiger un message IA</h2>
            <div className="flex items-center gap-3 mb-3">
              <select
                value={draftChannel}
                onChange={(e) => setDraftChannel(e.target.value as MessageChannel)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#1B2B4B] focus:outline-none focus:border-[#1B2B4B]/50 focus:ring-2 focus:ring-[#1B2B4B]/10"
              >
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button
                onClick={handleDraftMessage}
                disabled={isDrafting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#FF8C5A] transition-colors disabled:opacity-60"
              >
                {isDrafting ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Génération...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Générer
                  </>
                )}
              </button>
            </div>

            <input
              value={draftContext}
              onChange={(e) => setDraftContext(e.target.value)}
              placeholder="Contexte supplémentaire (optionnel)..."
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 focus:ring-2 focus:ring-[#1B2B4B]/10 mb-3"
            />

            {draftError && (
              <p className="text-sm text-red-600 mb-3">{draftError}</p>
            )}

            {draftedMessage && (
              <div className="bg-zinc-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-zinc-500">Message généré</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(draftedMessage)}
                    className="text-xs text-zinc-400 hover:text-[#1B2B4B] transition-colors"
                  >
                    Copier
                  </button>
                </div>
                <p className="text-sm text-[#1B2B4B] leading-relaxed whitespace-pre-wrap">{draftedMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column — AI analysis */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#1B2B4B]">Analyse IA</h2>
              <button
                onClick={handleQualify}
                disabled={isQualifying}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#FF6B35] border border-[#FF6B35]/20 rounded-lg hover:bg-[#FF6B35]/5 transition-colors disabled:opacity-60"
              >
                {isQualifying ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyse...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {aiAnalysis ? 'Re-qualifier' : 'Qualifier'}
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <p className="text-xs text-red-600 mb-3">{aiError}</p>
            )}

            {lead.ai_score !== null && (
              <div className="flex items-center justify-center mb-4">
                <div className="text-center">
                  <p className={`text-4xl font-bold ${scoreColor}`}>{lead.ai_score}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">score sur 10</p>
                </div>
              </div>
            )}

            {aiAnalysis ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Intention</p>
                  <p className="text-sm font-medium text-[#1B2B4B]">{INTENTION_LABELS[aiAnalysis.intention] ?? aiAnalysis.intention}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Urgence</p>
                  <p className="text-sm font-medium text-[#1B2B4B]">{URGENCE_LABELS[aiAnalysis.urgence] ?? aiAnalysis.urgence}</p>
                </div>
                {aiAnalysis.budget_estime && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-0.5">Budget estimé</p>
                    <p className="text-sm font-medium text-[#1B2B4B]">{aiAnalysis.budget_estime} €</p>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-100">
                  <p className="text-xs text-zinc-400 mb-1">Profil</p>
                  <p className="text-xs text-zinc-600 leading-relaxed">{aiAnalysis.profil}</p>
                </div>
                <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/10 rounded-lg p-3">
                  <p className="text-xs font-medium text-[#FF6B35] mb-1">Recommandation</p>
                  <p className="text-xs text-zinc-700 leading-relaxed">{aiAnalysis.recommandation}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-xs text-zinc-400">Cliquez sur &quot;Qualifier&quot; pour analyser ce lead avec l&apos;IA</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 bg-[#1B2B4B]/5 text-[#1B2B4B] rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit form modal */}
      {showEditForm && (
        <LeadForm
          lead={lead}
          onSuccess={() => {
            setShowEditForm(false)
            router.refresh()
          }}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-[#1B2B4B] mb-2">Supprimer ce lead ?</h3>
            <p className="text-sm text-zinc-500 mb-5">
              Cette action est irréversible. Toutes les données associées à ce lead seront supprimées.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
