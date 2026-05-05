'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Copy, ExternalLink } from 'lucide-react'
import { saveAvailability } from '@/actions/availability'

const DAYS_LABELS = [
  { value: 0, label: 'Dim' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
]

const HOURS = Array.from({ length: 25 }, (_, i) => i)
const DURATIONS = [15, 20, 30, 45, 60, 90, 120]

interface Props {
  agencyId: string
  bookingUrl: string
  initial: {
    days: number[]
    start_hour: number
    end_hour: number
    slot_duration: number
    advance_days: number
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handle() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#1B2B4B] transition-colors"
    >
      {copied
        ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">Copié !</span></>
        : <><Copy className="w-3.5 h-3.5" />Copier</>
      }
    </button>
  )
}

export function AvailabilityForm({ agencyId: _agencyId, bookingUrl, initial }: Props) {
  const [days, setDays] = useState<number[]>(initial.days)
  const [startHour, setStartHour] = useState(initial.start_hour)
  const [endHour, setEndHour] = useState(initial.end_hour)
  const [slotDuration, setSlotDuration] = useState(initial.slot_duration)
  const [advanceDays, setAdvanceDays] = useState(initial.advance_days)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggleDay(v: number) {
    setDays((d) => d.includes(v) ? d.filter((x) => x !== v) : [...d, v])
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const fd = new FormData()
    days.forEach((d) => fd.append('days', String(d)))
    fd.set('start_hour', String(startHour))
    fd.set('end_hour', String(endHour))
    fd.set('slot_duration', String(slotDuration))
    fd.set('advance_days', String(advanceDays))
    startTransition(async () => {
      const res = await saveAvailability(fd)
      if (res && 'error' in res) {
        setError(res.error ?? 'Une erreur est survenue')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Booking link */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="font-semibold text-zinc-800 mb-1">Lien de réservation public</h2>
        <p className="text-xs text-zinc-400 mb-3">Partagez ce lien à vos prospects pour qu&apos;ils réservent un créneau.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 truncate">
            {bookingUrl}
          </code>
          <CopyButton text={bookingUrl} />
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-[#1B2B4B] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-5 space-y-5">
        <h2 className="font-semibold text-zinc-800">Configuration des disponibilités</h2>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Days */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Jours disponibles</label>
          <div className="flex gap-2 flex-wrap">
            {DAYS_LABELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={`w-12 h-10 rounded-lg text-sm font-medium border transition-colors ${
                  days.includes(value)
                    ? 'bg-[#1B2B4B] text-white border-[#1B2B4B]'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-[#1B2B4B]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_hour" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Heure de début
            </label>
            <select
              id="start_hour"
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
            >
              {HOURS.slice(0, 24).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="end_hour" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Heure de fin
            </label>
            <select
              id="end_hour"
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
            >
              {HOURS.slice(1).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>

        {/* Slot duration */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Durée des créneaux</label>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSlotDuration(d)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  slotDuration === d
                    ? 'bg-[#1B2B4B] text-white border-[#1B2B4B]'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-[#1B2B4B]'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Advance days */}
        <div>
          <label htmlFor="advance_days" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Délai de réservation maximal
          </label>
          <div className="flex items-center gap-3">
            <input
              id="advance_days"
              type="range"
              min={7}
              max={90}
              step={7}
              value={advanceDays}
              onChange={(e) => setAdvanceDays(Number(e.target.value))}
              className="flex-1 accent-[#1B2B4B]"
            />
            <span className="text-sm font-semibold text-zinc-700 w-20 text-right">
              {advanceDays} jours
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Les prospects peuvent réserver jusqu&apos;à {advanceDays} jours à l&apos;avance.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending || days.length === 0}
          className="w-full bg-[#FF6B35] hover:bg-[#FF8C5A] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          {pending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Enregistré !</>
          ) : (
            'Enregistrer les disponibilités'
          )}
        </button>
      </form>
    </div>
  )
}
