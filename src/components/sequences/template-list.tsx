'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Pencil, Trash2, X } from 'lucide-react'
import { createTemplate, updateTemplate, deleteTemplate } from '@/actions/templates'
import type { Database } from '@/types/database'

type Template = Database['public']['Tables']['message_templates']['Row']
type Channel = 'email' | 'sms' | 'whatsapp'

const STARTER_LIMIT = 3

const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
}

const CHANNEL_COLORS: Record<Channel, string> = {
  email: 'bg-blue-50 text-blue-700 border-blue-100',
  sms: 'bg-green-50 text-green-700 border-green-100',
  whatsapp: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

const VARIABLES = ['{{prénom}}', '{{bien}}', '{{budget}}']

function TemplateModal({
  template,
  onClose,
  onSuccess,
}: {
  template?: Template
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [channel, setChannel] = useState<Channel>((template?.channel as Channel) ?? 'email')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function insertVariable(v: string) {
    setBody(b => b + v)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !body.trim()) {
      setError('Nom et corps du message requis')
      return
    }
    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('channel', channel)
    fd.set('subject', subject.trim())
    fd.set('body', body.trim())

    startTransition(async () => {
      const result = template
        ? await updateTemplate(template.id, fd)
        : await createTemplate(fd)
      if (result?.error) setError(result.error)
      else onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-800">
            {template ? 'Modifier le template' : 'Nouveau template'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Nom du template</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Relance J+3"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Canal</label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value as Channel)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          {channel === 'email' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Objet</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Votre bien vous attend…"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-zinc-700">Message</label>
              <div className="flex gap-1">
                {VARIABLES.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="text-[11px] bg-[#f0f3f9] text-[#1B2B4B] px-2 py-0.5 rounded font-mono hover:bg-[#1B2B4B] hover:text-white transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Bonjour {{prénom}}, votre bien {{bien}} correspond à votre budget de {{budget}}…"
              rows={5}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-800 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 bg-[#1B2B4B] hover:bg-[#2D4270] disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              {pending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : template ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TemplateList({
  templates,
  plan,
}: {
  templates: Template[]
  plan: 'starter' | 'pro' | 'agence'
}) {
  const [modal, setModal] = useState<{ open: boolean; template?: Template }>({ open: false })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDelete] = useTransition()
  const router = useRouter()

  const atLimit = plan === 'starter' && templates.length >= STARTER_LIMIT

  function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError(null)
    startDelete(async () => {
      const result = await deleteTemplate(id)
      if (result?.error) setDeleteError(result.error)
      else router.refresh()
      setDeletingId(null)
    })
  }

  function onMutationSuccess() {
    setModal({ open: false })
    router.refresh()
  }

  return (
    <div>
      {deleteError && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {deleteError}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        {plan === 'starter' ? (
          <p className="text-sm text-zinc-500">
            <span className={templates.length >= STARTER_LIMIT ? 'text-orange-600 font-medium' : ''}>
              {templates.length}/{STARTER_LIMIT}
            </span>{' '}
            templates utilisés
            {atLimit && (
              <span className="ml-2 text-xs text-zinc-400">— Passez en Pro pour des templates illimités</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">{templates.length} template{templates.length > 1 ? 's' : ''}</p>
        )}

        <button
          onClick={() => setModal({ open: true })}
          disabled={atLimit}
          title={atLimit ? 'Limite de 3 templates atteinte (plan Starter)' : undefined}
          className="flex items-center gap-1.5 bg-[#FF6B35] hover:bg-[#FF8C5A] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-zinc-200">
          <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">Aucun template</p>
          <p className="text-sm text-zinc-400 mt-1">
            Créez vos modèles de messages avec des variables dynamiques comme {VARIABLES[0]}, {VARIABLES[1]} et {VARIABLES[2]}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-800 text-sm truncate">{tpl.name}</p>
                  {tpl.subject && (
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{tpl.subject}</p>
                  )}
                </div>
                <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${CHANNEL_COLORS[tpl.channel as Channel] ?? ''}`}>
                  {CHANNEL_LABELS[tpl.channel as Channel] ?? tpl.channel}
                </span>
              </div>

              <p className="text-sm text-zinc-500 line-clamp-3 flex-1 mb-4">{tpl.body}</p>

              <div className="flex items-center justify-end gap-1 pt-3 border-t border-zinc-100">
                <button
                  onClick={() => setModal({ open: true, template: tpl })}
                  className="p-1.5 text-zinc-400 hover:text-[#1B2B4B] rounded-lg hover:bg-zinc-50 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  disabled={deletePending && deletingId === tpl.id}
                  className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  {deletePending && deletingId === tpl.id ? (
                    <span className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin block" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <TemplateModal
          template={modal.template}
          onClose={() => setModal({ open: false })}
          onSuccess={onMutationSuccess}
        />
      )}
    </div>
  )
}
