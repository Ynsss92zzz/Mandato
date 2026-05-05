'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, User, MapPin, CheckCircle, XCircle } from 'lucide-react'
import { DeleteAppointmentButton } from './delete-appointment-button'

type ApptType     = 'client' | 'personal'
type ApptStatus   = 'planifie' | 'confirme' | 'annule' | 'effectue'
type ApptCategory = 'reunion_interne' | 'visite_terrain' | 'formation' | 'autre'

export interface AppointmentRow {
  id: string
  title: string
  type: ApptType
  category: ApptCategory | null
  status: ApptStatus
  scheduled_at: string
  duration_min: number
  location: string | null
  notes: string | null
  lead_id: string | null
}

export interface LeadInfo {
  name: string
  email: string | null
}

const STATUS_CONFIG: Record<ApptStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  planifie: { label: 'Planifié',  bg: 'bg-blue-50',  text: 'text-blue-700',  icon: Clock },
  confirme: { label: 'Confirmé', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
  annule:   { label: 'Annulé',   bg: 'bg-red-50',   text: 'text-red-700',   icon: XCircle },
  effectue: { label: 'Effectué', bg: 'bg-zinc-100', text: 'text-zinc-600',  icon: CheckCircle },
}

const CATEGORY_LABELS: Record<ApptCategory, string> = {
  reunion_interne: 'Réunion interne',
  visite_terrain:  'Visite terrain',
  formation:       'Formation',
  autre:           'Autre',
}

function StatusBadge({ status }: { status: ApptStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function TypeBadge({ type }: { type: ApptType }) {
  return type === 'client' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      Client
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#fff4f0] text-[#FF6B35]">
      Personnel
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  appt: AppointmentRow
  lead: LeadInfo | null
  variant: 'upcoming' | 'past'
}

export function AppointmentCard({ appt, lead, variant }: Props) {
  const [state, setState] = useState<'visible' | 'fading' | 'gone'>('visible')
  const isClient = appt.type === 'client'

  function handleSuccess() {
    setState('fading')
    setTimeout(() => setState('gone'), 300)
  }

  if (state === 'gone') return null

  const style: React.CSSProperties = {
    opacity: state === 'fading' ? 0 : 1,
    transition: 'opacity 300ms ease',
    pointerEvents: state === 'fading' ? 'none' : undefined,
  }

  if (variant === 'past') {
    return (
      <div
        style={style}
        className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center gap-3 opacity-60 hover:opacity-80 transition-opacity"
      >
        <TypeBadge type={appt.type} />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-zinc-600 text-sm truncate block">{appt.title}</span>
          <p className="text-xs text-zinc-400 mt-0.5">
            {formatDate(appt.scheduled_at)} à {formatTime(appt.scheduled_at)}
            {lead ? ` · ${lead.name}` : ''}
          </p>
        </div>
        <StatusBadge status={appt.status} />
        <DeleteAppointmentButton id={appt.id} title={appt.title} onSuccess={handleSuccess} />
      </div>
    )
  }

  return (
    <div
      style={style}
      className={`bg-white rounded-xl border-2 p-4 flex items-start gap-4 ${
        isClient
          ? 'border-blue-100 hover:border-blue-200'
          : 'border-[#FF6B35]/20 hover:border-[#FF6B35]/40'
      }`}
    >
      {/* Date badge */}
      <div className={`flex-none w-14 text-center rounded-xl py-2 px-1 ${isClient ? 'bg-blue-50' : 'bg-[#fff4f0]'}`}>
        <p className={`text-xs font-medium uppercase ${isClient ? 'text-blue-700/60' : 'text-[#FF6B35]/60'}`}>
          {new Date(appt.scheduled_at).toLocaleDateString('fr-FR', { month: 'short' })}
        </p>
        <p className={`text-2xl font-bold leading-tight ${isClient ? 'text-blue-700' : 'text-[#FF6B35]'}`}>
          {new Date(appt.scheduled_at).getDate()}
        </p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-1.5">
          <TypeBadge type={appt.type} />
          {!isClient && appt.category && (
            <span className="text-xs text-zinc-400">{CATEGORY_LABELS[appt.category]}</span>
          )}
          <StatusBadge status={appt.status} />
        </div>

        <h3 className="font-semibold text-zinc-800 truncate mb-1.5">{appt.title}</h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(appt.scheduled_at)} · {appt.duration_min} min
          </span>

          {isClient && lead && (
            <Link
              href={`/leads/${appt.lead_id}`}
              className="flex items-center gap-1 hover:text-blue-700 transition-colors font-medium"
            >
              <User className="w-3.5 h-3.5" />
              {lead.name}
              {lead.email && <span className="font-normal text-zinc-400">· {lead.email}</span>}
            </Link>
          )}

          {!isClient && appt.notes && (
            <span className="text-zinc-400 truncate max-w-xs">{appt.notes}</span>
          )}

          {appt.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {appt.location}
            </span>
          )}
        </div>
      </div>

      <DeleteAppointmentButton id={appt.id} title={appt.title} onSuccess={handleSuccess} />
    </div>
  )
}
