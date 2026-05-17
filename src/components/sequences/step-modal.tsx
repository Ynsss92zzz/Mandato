'use client'

import { useState } from 'react'
import type { MessageChannel } from '@/types'
import type { StepDraft } from '@/actions/sequences'
import type { MessageTemplate } from './sequence-editor'

const CHANNELS: { value: MessageChannel; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'sms', label: 'SMS', icon: '💬' },
  { value: 'note', label: 'Note interne', icon: '📝' },
]

const DELAY_PRESETS = [
  { value: 1, label: '1 heure' },
  { value: 24, label: '1 jour' },
  { value: 48, label: '2 jours' },
  { value: 72, label: '3 jours' },
  { value: 168, label: '1 semaine' },
  { value: 336, label: '2 semaines' },
]

const VARIABLES = ['{{prenom}}', '{{nom}}', '{{email}}', '{{telephone}}', '{{budget}}']

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50 focus:ring-2 focus:ring-[#1B2B4B]/10 transition-colors'

interface StepModalProps {
  step?: StepDraft & { index?: number }
  templates?: MessageTemplate[]
  onSave: (step: StepDraft) => void
  onClose: () => void
}

export function StepModal({ step, templates = [], onSave, onClose }: StepModalProps) {
  const isEdit = !!step
  const [channel, setChannel] = useState<MessageChannel>(step?.channel ?? 'email')
  const [delayHours, setDelayHours] = useState(step?.delay_hours ?? 24)
  const [customDelay, setCustomDelay] = useState(!DELAY_PRESETS.find((p) => p.value === (step?.delay_hours ?? 24)))
  const [subject, setSubject] = useState(step?.subject ?? '')
  const [content, setContent] = useState(step?.content_template ?? '')
  const [isAI, setIsAI] = useState(step?.is_ai_generated ?? false)
  const [error, setError] = useState<string | null>(null)

  function insertVariable(v: string) {
    setContent((c) => c + v)
  }

  function handleSave() {
    if (!content.trim()) {
      setError('Le contenu est obligatoire')
      return
    }
    onSave({
      delay_hours: delayHours,
      channel,
      subject: channel === 'email' ? subject || null : null,
      content_template: content.trim(),
      is_ai_generated: isAI,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-semibold text-[#1B2B4B]">
            {isEdit ? "Modifier l'étape" : 'Ajouter une étape'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Canal */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">Canal d&apos;envoi</label>
            <div className="grid grid-cols-4 gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChannel(c.value)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-colors ${
                    channel === c.value
                      ? 'border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35]'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Délai */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              Délai après l&apos;étape précédente
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DELAY_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setDelayHours(p.value); setCustomDelay(false) }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    !customDelay && delayHours === p.value
                      ? 'border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35]'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomDelay(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  customDelay ? 'border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35]' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                }`}
              >
                Personnalisé
              </button>
            </div>
            {customDelay && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={delayHours}
                  onChange={(e) => setDelayHours(parseInt(e.target.value) || 1)}
                  className={`${inputCls} w-24`}
                />
                <span className="text-sm text-zinc-500">heures</span>
              </div>
            )}
          </div>

          {/* Template selector */}
          {channel !== 'note' && (() => {
            const filtered = templates.filter((t) => t.channel === channel)
            if (filtered.length === 0) return null
            return (
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Utiliser un template existant
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const tpl = filtered.find((t) => t.id === e.target.value)
                    if (!tpl) return
                    setSubject(tpl.subject ?? '')
                    setContent(tpl.body)
                  }}
                  className={inputCls}
                >
                  <option value="" disabled>— Sélectionner un template —</option>
                  {filtered.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-400 mt-1">
                  Le sujet et le contenu seront remplacés par ceux du template.
                </p>
              </div>
            )
          })()}

          {/* Sujet (email uniquement) */}
          {channel === 'email' && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Sujet de l&apos;email</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Votre projet immobilier — suivi"
                className={inputCls}
              />
            </div>
          )}

          {/* Contenu */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-600">
                {isAI ? 'Instructions pour l\'IA' : 'Contenu du message'}
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400">IA</span>
                <button
                  type="button"
                  onClick={() => setIsAI(!isAI)}
                  className={`relative w-8 h-4 rounded-full transition-colors ${isAI ? 'bg-[#FF6B35]' : 'bg-zinc-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isAI ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder={isAI
                ? 'Instructions pour l\'IA : Rédigez un message de relance chaleureux pour {{prenom}}, mettez en avant...'
                : 'Bonjour {{prenom}},\n\nJ\'ai bien reçu votre demande et je reviens vers vous...'
              }
              className={`${inputCls} resize-none`}
            />

            {!isAI && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-xs text-zinc-400">Variables :</span>
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="text-xs px-1.5 py-0.5 bg-[#1B2B4B]/5 text-[#1B2B4B] rounded hover:bg-[#1B2B4B]/10 transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#FF8C5A] transition-colors"
            >
              {isEdit ? "Enregistrer l'étape" : "Ajouter l'étape"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
