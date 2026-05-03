'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removeMember, updateMemberRole } from '@/actions/team'
import { InviteModal } from './invite-modal'
import type { AgencyMemberRole } from '@/types'

interface TeamMember {
  id: string
  role: AgencyMemberRole
  joined_at: string
  profile_id: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  leadCount: number
  wonCount: number
}

interface TeamViewProps {
  members: TeamMember[]
  currentUserId: string
  isOwner: boolean
}

const ROLE_CONFIG: Record<AgencyMemberRole, { label: string; color: string }> = {
  owner: { label: 'Propriétaire', color: 'bg-amber-100 text-amber-700' },
  agent: { label: 'Agent', color: 'bg-blue-100 text-blue-700' },
}

function MemberAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name ?? ''} className="w-10 h-10 rounded-full object-cover" />
    )
  }

  return (
    <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center flex-none">
      <span className="text-xs font-semibold text-white">{initials}</span>
    </div>
  )
}

export function TeamView({ members, currentUserId, isOwner }: TeamViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showInvite, setShowInvite] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleRoleChange(member: TeamMember, newRole: AgencyMemberRole) {
    if (newRole === member.role) return
    startTransition(async () => {
      const result = await updateMemberRole(member.id, newRole)
      if (result.error) showToast(result.error)
      else router.refresh()
    })
  }

  function handleRemove(member: TeamMember) {
    startTransition(async () => {
      const result = await removeMember(member.id)
      if (result.error) showToast(result.error)
      else {
        setRemovingId(null)
        router.refresh()
      }
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-navy">Mon équipe</h1>
          <span className="text-sm text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full font-medium">
            {members.length}
          </span>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 bg-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-light transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Inviter un membre
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-navy-50 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-navy/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-navy mb-1">Aucun membre</p>
            <p className="text-xs text-zinc-400">Invitez des agents pour collaborer sur vos leads</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Membre</th>
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Rôle</th>
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Leads</th>
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Gagnés</th>
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Taux</th>
                <th className="text-left text-xs font-medium text-zinc-400 px-5 py-3">Rejoint le</th>
                {isOwner && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {members.map((member) => {
                const roleCfg = ROLE_CONFIG[member.role]
                const rate = member.leadCount > 0
                  ? Math.round((member.wonCount / member.leadCount) * 100)
                  : 0
                const isCurrentUser = member.profile_id === currentUserId

                return (
                  <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={member.fullName} avatarUrl={member.avatarUrl} />
                        <div>
                          <p className="text-sm font-medium text-navy">
                            {member.fullName ?? 'Sans nom'}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-zinc-400">(vous)</span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-400">{member.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {isOwner && !isCurrentUser ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as AgencyMemberRole)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/20 ${roleCfg.color}`}
                        >
                          <option value="agent">Agent</option>
                          <option value="owner">Propriétaire</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleCfg.color}`}>
                          {roleCfg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-navy font-medium">{member.leadCount}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-navy font-medium">{member.wonCount}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-400 rounded-full"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-zinc-400">
                        {new Date(member.joined_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="px-5 py-4">
                        {!isCurrentUser && (
                          <button
                            onClick={() => setRemovingId(member.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Retirer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                            </svg>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Remove confirm modal */}
      {removingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRemovingId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-navy mb-2">Retirer ce membre ?</h3>
            <p className="text-sm text-zinc-500 mb-5">
              Ce membre perdra l&apos;accès à l&apos;agence. Ses leads restent dans le système.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemovingId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleRemove(members.find((m) => m.id === removingId)!)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  )
}
