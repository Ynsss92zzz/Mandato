'use client'

import { useState, useEffect, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Clock, User, Mail, Phone, MessageSquare, Check, Loader2 } from 'lucide-react'

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

interface Props {
  agencyId: string
  availableDays: number[]
  advanceDays: number
  slotDuration: number
}

type Step = 'calendar' | 'slots' | 'form' | 'success'

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  message: string
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

export function BookingCalendar({ agencyId, availableDays, advanceDays, slotDuration }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + advanceDays)

  const [step, setStep] = useState<Step>('calendar')
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({ first_name: '', last_name: '', email: '', phone: '', message: '' })
  const [submitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const grid = buildMonthGrid(viewYear, viewMonth)

  function isDaySelectable(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    d.setHours(0, 0, 0, 0)
    if (d < today || d > maxDate) return false
    return availableDays.includes(d.getDay())
  }

  function formatDate(dateStr: string) {
    const d = new Date(`${dateStr}T12:00:00`)
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function formatDatetime(dateStr: string, time: string) {
    const d = new Date(`${dateStr}T${time}:00`)
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      + ' à ' + time
  }

  async function selectDay(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setLoadingSlots(true)
    setStep('slots')
    try {
      const res = await fetch(`/api/booking/${agencyId}/slots?date=${dateStr}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot)
    setStep('form')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    startSubmit(async () => {
      const datetime = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString()
      const res = await fetch(`/api/booking/${agencyId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, datetime }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Une erreur est survenue.')
      } else {
        setStep('success')
      }
    })
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth())

  // ── Success ──────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-[#1B2B4B] mb-2">Rendez-vous confirmé !</h2>
        <p className="text-zinc-500 text-sm mb-4">
          {selectedDate && selectedSlot && formatDatetime(selectedDate, selectedSlot)}
        </p>
        <p className="text-zinc-400 text-sm">Un email de confirmation vous a été envoyé à {form.email}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <button onClick={() => setStep('calendar')} className={step !== 'calendar' ? 'text-[#FF6B35] font-medium hover:underline' : 'font-medium text-zinc-600'}>
          Choisir une date
        </button>
        {(step === 'slots' || step === 'form') && (
          <>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => setStep('slots')} className={step === 'slots' ? 'font-medium text-zinc-600' : 'text-[#FF6B35] font-medium hover:underline'}>
              Choisir un horaire
            </button>
          </>
        )}
        {step === 'form' && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-zinc-600">Vos informations</span>
          </>
        )}
      </div>

      {/* ── Step 1 : Calendar ─────────────────────────────────────────────── */}
      {step === 'calendar' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} disabled={!canGoPrev} className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-zinc-700 text-sm">
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-zinc-400 py-1 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((day, i) => {
              if (!day) return <div key={i} />
              const selectable = isDaySelectable(day)
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = dateStr === today.toISOString().slice(0, 10)
              return (
                <button
                  key={i}
                  onClick={() => selectable && selectDay(day)}
                  disabled={!selectable}
                  className={`
                    aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-colors
                    ${selectable
                      ? 'hover:bg-[#1B2B4B] hover:text-white cursor-pointer text-zinc-700'
                      : 'text-zinc-300 cursor-not-allowed'}
                    ${isToday && selectable ? 'ring-2 ring-[#FF6B35] ring-offset-1' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <p className="text-xs text-zinc-400 text-center mt-4">
            <Clock className="inline w-3 h-3 mr-1" />
            Créneaux de {slotDuration} minutes
          </p>
        </div>
      )}

      {/* ── Step 2 : Slots ────────────────────────────────────────────────── */}
      {step === 'slots' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-700 mb-1 text-sm">
            {selectedDate && formatDate(selectedDate)}
          </h2>
          <p className="text-xs text-zinc-400 mb-4">Choisissez un horaire disponible</p>

          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-400 mb-3">Aucun créneau disponible ce jour.</p>
              <button onClick={() => setStep('calendar')} className="text-sm text-[#FF6B35] font-medium hover:underline">
                ← Choisir une autre date
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => selectSlot(slot)}
                  className="py-2.5 rounded-xl border-2 border-zinc-200 hover:border-[#1B2B4B] hover:bg-[#1B2B4B] hover:text-white text-sm font-medium text-zinc-700 transition-colors"
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3 : Form ─────────────────────────────────────────────────── */}
      {step === 'form' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          {/* Selected slot recap */}
          <div className="bg-[#f0f3f9] rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <Clock className="w-4 h-4 text-[#1B2B4B] flex-none" />
            <div>
              <p className="text-xs text-zinc-400">Votre rendez-vous</p>
              <p className="text-sm font-semibold text-[#1B2B4B]">
                {selectedDate && selectedSlot && formatDatetime(selectedDate, selectedSlot)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {submitError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Prénom *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    required value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    placeholder="Jean"
                    className="w-full border border-zinc-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom</label>
                <input
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder="Dupont"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  required type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="vous@exemple.fr"
                  className="w-full border border-zinc-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="tel" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full border border-zinc-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Message (optionnel)</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-zinc-400" />
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Précisez votre projet immobilier…"
                  rows={3}
                  className="w-full border border-zinc-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B] resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#FF6B35] hover:bg-[#FF8C5A] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Confirmation en cours…</>
              ) : (
                <><Check className="w-4 h-4" /> Confirmer le rendez-vous</>
              )}
            </button>

            <p className="text-xs text-zinc-400 text-center">
              En confirmant, vous acceptez d'être contacté par l'agence.
            </p>
          </form>
        </div>
      )}
    </div>
  )
}
