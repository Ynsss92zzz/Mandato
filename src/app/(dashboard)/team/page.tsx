import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TeamView } from '@/components/team/team-view'
import type { AgencyMemberRole } from '@/types'

export const metadata: Metadata = { title: 'Équipe — Mandato' }

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check plan
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .single()

  const isAgencePlan = subscription?.plan === 'agence'

  if (!isAgencePlan) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy mb-6">Mon équipe</h1>
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-navy mb-1">Plan Agence requis</p>
          <p className="text-xs text-zinc-400 mb-5 max-w-xs">
            La gestion d&apos;équipe multi-agents est disponible à partir du plan Agence à 149€/mois.
          </p>
          <a
            href="/settings/billing"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-orange rounded-lg hover:bg-orange-light transition-colors"
          >
            Passer au plan Agence
          </a>
        </div>
      </div>
    )
  }

  // Fetch members with profile data
  const { data: rawMembers } = await supabase
    .from('agency_members')
    .select('id, role, joined_at, profile_id')
    .order('joined_at', { ascending: true })

  const profileIds = (rawMembers ?? []).map((m) => m.profile_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', profileIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  // Fetch lead counts per agent
  const { data: leadRows } = await supabase
    .from('leads')
    .select('assigned_to, status')

  const leadCountMap: Record<string, number> = {}
  const wonCountMap: Record<string, number> = {}
  for (const row of leadRows ?? []) {
    if (!row.assigned_to) continue
    leadCountMap[row.assigned_to] = (leadCountMap[row.assigned_to] ?? 0) + 1
    if (row.status === 'gagne') {
      wonCountMap[row.assigned_to] = (wonCountMap[row.assigned_to] ?? 0) + 1
    }
  }

  const members = (rawMembers ?? []).map((m) => {
    const profile = profileMap[m.profile_id]
    return {
      id: m.id,
      role: m.role as AgencyMemberRole,
      joined_at: m.joined_at,
      profile_id: m.profile_id,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      leadCount: leadCountMap[m.profile_id] ?? 0,
      wonCount: wonCountMap[m.profile_id] ?? 0,
    }
  })

  const currentMember = rawMembers?.find((m) => m.profile_id === user.id)
  const isOwner = currentMember?.role === 'owner'

  return (
    <TeamView members={members} currentUserId={user.id} isOwner={isOwner} />
  )
}
