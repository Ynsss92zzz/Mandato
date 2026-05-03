'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { StepModal } from './step-modal'
import { saveSequenceWithSteps } from '@/actions/sequences'
import type { StepDraft } from '@/actions/sequences'
import type { MessageChannel } from '@/types'
import type { Database } from '@/types/database'

type Sequence = Database['public']['Tables']['sequences']['Row']
type SequenceStep = Database['public']['Tables']['sequence_steps']['Row']
type SequenceStatus = 'actif' | 'pause' | 'archive'

const CHANNEL_ICONS: Record<MessageChannel, string> = {
  email: '✉️',
  sms: '💬',
  whatsapp: '📱',
  note: '📝',
}

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  note: 'Note',
}

const TRIGGER_OPTIONS = [
  { value: 'lead_created', label: 'Nouveau lead créé' },
  { value: 'lead_qualified', label: 'Lead qualifié' },
  { value: 'no_response_48h', label: 'Pas de réponse depuis 48h' },
  { value: 'no_response_7d', label: 'Pas de réponse depuis 7 jours' },
  { value: 'manual', label: 'Déclenchement manuel' },
]

function formatDelay(hours: number) {
  if (hours < 24) return `${hours}h après`
  if (hours === 24) return '1 jour après'
  if (hours % 168 === 0) return `${hours / 168} semaine${hours / 168 > 1 ? 's' : ''} après`
  return `${Math.floor(hours / 24)} jours après`
}

interface SortableStepProps {
  id: string
  step: StepDraft
  index: number
  onEdit: () => void
  onDelete: () => void
}

function SortableStep({ id, step, index, onEdit, onDelete }: SortableStepProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const ch = step.channel as MessageChannel

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 items-start">
      {/* Timeline connector */}
      <div className="flex flex-col items-center flex-none" style={{ width: 28 }}>
        <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-xs font-bold text-white flex-none">
          {index + 1}
        </div>
        <div className="w-px flex-1 bg-zinc-200 mt-1 min-h-[24px]" />
      </div>

      {/* Card */}
      <div className="flex-1 bg-white border border-zinc-200 rounded-xl p-4 mb-3 hover:border-zinc-300 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing flex-none"
              title="Réordonner"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6a2 2 0 110-4 2 2 0 010 4zM8 14a2 2 0 110-4 2 2 0 010 4zM8 22a2 2 0 110-4 2 2 0 010 4zM16 6a2 2 0 110-4 2 2 0 010 4zM16 14a2 2 0 110-4 2 2 0 010 4zM16 22a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-base">{CHANNEL_ICONS[ch]}</span>
                <span className="text-sm font-semibold text-navy">{CHANNEL_LABELS[ch]}</span>
                <span className="text-xs text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-100">
                  {formatDelay(step.delay_hours)}
                </span>
                {step.is_ai_generated && (
                  <span className="text-xs text-orange bg-orange/10 px-2 py-0.5 rounded-full font-medium">
                    IA
                  </span>
                )}
              </div>
              {ch === 'email' && step.subject && (
                <p className="text-xs font-medium text-zinc-600 mb-0.5">
                  Sujet : {step.subject}
                </p>
              )}
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                {step.content_template}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-none">
            <button
              onClick={onEdit}
              className="p-1.5 text-zinc-400 hover:text-navy hover:bg-zinc-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SequenceEditorProps {
  sequenceId: string
  sequence?: Sequence
  initialSteps?: SequenceStep[]
}

export function SequenceEditor({ sequenceId, sequence, initialSteps = [] }: SequenceEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(sequence?.name ?? '')
  const [triggerOn, setTriggerOn] = useState(sequence?.trigger_on ?? 'lead_created')
  const [status, setStatus] = useState<SequenceStatus>((sequence?.status as SequenceStatus) ?? 'actif')

  const [steps, setSteps] = useState<StepDraft[]>(
    initialSteps
      .sort((a, b) => a.step_order - b.step_order)
      .map((s) => ({
        delay_hours: s.delay_hours,
        channel: s.channel as MessageChannel,
        subject: s.subject,
        content_template: s.content_template,
        is_ai_generated: s.is_ai_generated,
      }))
  )

  // IDs for DnD (use index-based stable IDs)
  const [stepIds, setStepIds] = useState<string[]>(() => steps.map((_, i) => `step-${i}`))

  const [stepModal, setStepModal] = useState<{ open: boolean; editIndex?: number }>({ open: false })
  const [saveError, setSaveError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setSteps((prev) => {
      const oldIndex = stepIds.indexOf(active.id as string)
      const newIndex = stepIds.indexOf(over.id as string)
      return arrayMove(prev, oldIndex, newIndex)
    })
    setStepIds((prev) => {
      const oldIndex = prev.indexOf(active.id as string)
      const newIndex = prev.indexOf(over.id as string)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function handleAddStep(step: StepDraft) {
    const newId = `step-${Date.now()}`
    setSteps((prev) => [...prev, step])
    setStepIds((prev) => [...prev, newId])
    setStepModal({ open: false })
  }

  function handleEditStep(index: number, step: StepDraft) {
    setSteps((prev) => prev.map((s, i) => (i === index ? step : s)))
    setStepModal({ open: false })
  }

  function handleDeleteStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
    setStepIds((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const result = await saveSequenceWithSteps(
        sequenceId,
        { name, trigger_on: triggerOn, status },
        steps
      )
      if (result?.error) {
        setSaveError(result.error)
      } else {
        router.push('/sequences')
      }
    })
  }

  return (
    <div className="max-w-2xl">
      {/* Sequence metadata */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Nom de la séquence *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Relance nouveaux leads"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-navy placeholder-zinc-300 focus:outline-none focus:border-navy/50 focus:ring-2 focus:ring-navy/10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Déclencheur</label>
            <select
              value={triggerOn}
              onChange={(e) => setTriggerOn(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy/50 focus:ring-2 focus:ring-navy/10"
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SequenceStatus)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy/50 focus:ring-2 focus:ring-navy/10"
            >
              <option value="actif">Actif</option>
              <option value="pause">En pause</option>
              <option value="archive">Archivé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-navy">
            Étapes ({steps.length})
          </h2>
        </div>

        {steps.length === 0 && (
          <div className="bg-white border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center py-12 text-center mb-4">
            <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500">Aucune étape</p>
            <p className="text-xs text-zinc-400 mt-1">Ajoutez des étapes pour définir votre séquence</p>
          </div>
        )}

        {steps.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
              <div>
                {steps.map((step, index) => (
                  <SortableStep
                    key={stepIds[index]}
                    id={stepIds[index]}
                    step={step}
                    index={index}
                    onEdit={() => setStepModal({ open: true, editIndex: index })}
                    onDelete={() => handleDeleteStep(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <button
          onClick={() => setStepModal({ open: true })}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 text-zinc-400 hover:border-orange hover:text-orange rounded-xl py-3 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une étape
        </button>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-4">
          {saveError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/sequences')}
          className="px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-navy rounded-lg hover:bg-navy-light transition-colors disabled:opacity-60"
        >
          {isPending ? 'Enregistrement...' : sequenceId === 'new' ? 'Créer la séquence' : 'Enregistrer'}
        </button>
      </div>

      {/* Step modal */}
      {stepModal.open && (
        <StepModal
          step={stepModal.editIndex !== undefined ? { ...steps[stepModal.editIndex], index: stepModal.editIndex } : undefined}
          onSave={(step) => {
            if (stepModal.editIndex !== undefined) {
              handleEditStep(stepModal.editIndex, step)
            } else {
              handleAddStep(step)
            }
          }}
          onClose={() => setStepModal({ open: false })}
        />
      )}
    </div>
  )
}
