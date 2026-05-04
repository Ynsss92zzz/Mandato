'use client'

import { useState, useTransition } from 'react'
import { inviteMember } from '@/actions/team'
import type { AgencyMemberRole } from '@/types'

interface InviteModalProps {
  onClose: () => void
  onSuccess: (message: string) => void
}

export function InviteModal({ onClose, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AgencyMemberRole>('agent')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await inviteMember(email.trim(), role)
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess(result.message ?? 'Invitation envoyée')
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-[#1B2B4B]">Inviter un membre</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-[#1B2B4B] rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@exemple.fr"
              required
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-[#1B2B4B] placeholder-zinc-300 focus:outline-none focus:border-[#1B2B4B]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Rôle
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('agent')}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  role === 'agent'
                    ? 'border-[#1B2B4B] bg-[#1B2B4B] text-white'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <span className="block text-base mb-0.5">👤</span>
                Agent
              </button>
              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  role === 'owner'
                    ? 'border-[#1B2B4B] bg-[#1B2B4B] text-white'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <span className="block text-base mb-0.5">👑</span>
                Propriétaire
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              {role === 'owner'
                ? 'Accès complet, peut inviter et gérer l\'équipe.'
                : 'Accès limité à ses propres leads et conversations.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#FF8C5A] transition-colors disabled:opacity-50"
            >
              {isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
