'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateAgencySettings(formData: FormData): Promise<{ error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = formData.get('agency_id') as string

  // Vérifier que l'utilisateur est owner de cette agence
  const { data: member } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', agencyId)
    .eq('profile_id', user.id)
    .single()

  if (member?.role !== 'owner') return { error: 'Permission insuffisante' }

  const rawInboundEmail = (formData.get('inbound_email') as string).trim().toLowerCase() || null
  if (rawInboundEmail && !rawInboundEmail.endsWith('@withmandato.com')) {
    return { error: 'L\'email entrant doit utiliser le domaine @withmandato.com' }
  }

  const { error } = await supabase
    .from('agencies')
    .update({
      name: (formData.get('name') as string).trim(),
      slug: (formData.get('slug') as string).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      logo_url: (formData.get('logo_url') as string) || null,
      website_url: (formData.get('website_url') as string) || null,
      phone: (formData.get('phone') as string) || null,
      address: (formData.get('address') as string) || null,
      inbound_email: rawInboundEmail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agencyId)

  if (error) return { error: error.message }
  return null
}

export async function updateNotificationPreferences(formData: FormData): Promise<{ error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  if (!member) return { error: 'Agence introuvable' }

  const { error } = await supabase
    .from('agencies')
    .update({
      notif_morning_briefing: formData.get('notif_morning_briefing') === 'true',
      notif_weekly_report:    formData.get('notif_weekly_report')    === 'true',
      notif_hot_leads:        formData.get('notif_hot_leads')        === 'true',
      updated_at: new Date().toISOString(),
    })
    .eq('id', member.agency_id)

  if (error) return { error: error.message }
  return null
}

export async function updateProfileSettings(formData: FormData): Promise<{ error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: (formData.get('full_name') as string).trim() || null,
      avatar_url: (formData.get('avatar_url') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return null
}
