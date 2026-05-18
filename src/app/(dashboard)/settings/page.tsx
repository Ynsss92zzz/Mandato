import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AgencySettingsForm } from '@/components/settings/agency-settings-form'

export const metadata: Metadata = { title: 'Paramètres' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('profile_id', user.id)
    .single()

  const isOwner = member?.role === 'owner'

  const { data: agency } = member?.agency_id
    ? await supabase
        .from('agencies')
        .select('id, name, slug, logo_url, website_url, phone, address, notif_morning_briefing, notif_weekly_report, notif_hot_leads')
        .eq('id', member.agency_id)
        .single()
    : { data: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Paramètres</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Gérez les informations de votre agence et votre profil</p>
      </div>

      <AgencySettingsForm
        agencyId={agency?.id ?? ''}
        userId={user.id}
        isOwner={isOwner}
        initialAgency={{
          name: agency?.name ?? '',
          slug: agency?.slug ?? '',
          logo_url: agency?.logo_url ?? null,
          website_url: agency?.website_url ?? null,
          phone: agency?.phone ?? null,
          address: agency?.address ?? null,
        }}
        initialProfile={{
          full_name: profile?.full_name ?? '',
          email: profile?.email ?? user.email ?? '',
          avatar_url: profile?.avatar_url ?? null,
        }}
        initialNotifPrefs={{
          notif_morning_briefing: agency?.notif_morning_briefing ?? true,
          notif_weekly_report:    agency?.notif_weekly_report    ?? true,
          notif_hot_leads:        agency?.notif_hot_leads        ?? true,
        }}
      />
    </div>
  )
}
