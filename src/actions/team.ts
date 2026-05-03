'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import type { AgencyMemberRole } from '@/types'

async function getCallerContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('profile_id', user.id)
    .single()

  if (!membership) return null
  return { userId: user.id, agencyId: membership.agency_id, role: membership.role }
}

export async function inviteMember(email: string, role: AgencyMemberRole) {
  const supabase = await createClient()
  const ctx = await getCallerContext(supabase)
  if (!ctx) return { error: 'Non authentifié' }
  if (ctx.role !== 'owner') return { error: 'Seul le propriétaire peut inviter des membres' }

  // Find existing profile by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email)
    .single()

  if (profile) {
    // Check if already a member
    const { data: existing } = await supabase
      .from('agency_members')
      .select('id')
      .eq('agency_id', ctx.agencyId)
      .eq('profile_id', profile.id)
      .single()

    if (existing) return { error: 'Cet utilisateur est déjà membre de l\'agence' }

    // Add directly
    const { error } = await supabase.from('agency_members').insert({
      agency_id: ctx.agencyId,
      profile_id: profile.id,
      role,
    })

    if (error) return { error: 'Erreur lors de l\'ajout du membre' }

    await sendEmail({
      to: email,
      subject: 'Vous avez été ajouté à une agence sur Mandato',
      text: `Bonjour ${profile.full_name ?? ''},\n\nVous avez été ajouté à une agence sur Mandato en tant que ${role === 'owner' ? 'propriétaire' : 'agent'}.\n\nConnectez-vous sur https://app.mandato.fr pour accéder à votre espace.\n\nL'équipe Mandato`,
    })

    revalidatePath('/team')
    return { success: true, added: true, message: 'Membre ajouté avec succès' }
  }

  // User not found — send signup invite
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'
  await sendEmail({
    to: email,
    subject: 'Invitation à rejoindre Mandato',
    text: `Bonjour,\n\nVous avez été invité à rejoindre une agence sur Mandato.\n\nCréez votre compte ici : ${appUrl}/register\n\nUne fois inscrit, demandez à votre administrateur de vous ajouter à nouveau.\n\nL'équipe Mandato`,
  })

  return { success: true, invited: true, message: 'Invitation envoyée par email' }
}

export async function removeMember(memberId: string) {
  const supabase = await createClient()
  const ctx = await getCallerContext(supabase)
  if (!ctx) return { error: 'Non authentifié' }
  if (ctx.role !== 'owner') return { error: 'Seul le propriétaire peut retirer des membres' }

  // Prevent removing yourself if you're the only owner
  const { data: member } = await supabase
    .from('agency_members')
    .select('profile_id, role')
    .eq('id', memberId)
    .eq('agency_id', ctx.agencyId)
    .single()

  if (!member) return { error: 'Membre introuvable' }
  if (member.profile_id === ctx.userId) return { error: 'Vous ne pouvez pas vous retirer vous-même' }

  const { error } = await supabase
    .from('agency_members')
    .delete()
    .eq('id', memberId)
    .eq('agency_id', ctx.agencyId)

  if (error) return { error: 'Erreur lors de la suppression' }

  revalidatePath('/team')
  return { success: true }
}

export async function updateMemberRole(memberId: string, role: AgencyMemberRole) {
  const supabase = await createClient()
  const ctx = await getCallerContext(supabase)
  if (!ctx) return { error: 'Non authentifié' }
  if (ctx.role !== 'owner') return { error: 'Seul le propriétaire peut modifier les rôles' }

  const { error } = await supabase
    .from('agency_members')
    .update({ role })
    .eq('id', memberId)
    .eq('agency_id', ctx.agencyId)

  if (error) return { error: 'Erreur lors de la mise à jour du rôle' }

  revalidatePath('/team')
  return { success: true }
}

export async function assignLeadToAgent(leadId: string, agentProfileId: string | null) {
  const supabase = await createClient()
  const ctx = await getCallerContext(supabase)
  if (!ctx) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('leads')
    .update({ assigned_to: agentProfileId })
    .eq('id', leadId)

  if (error) return { error: 'Erreur lors de l\'assignation' }

  revalidatePath('/leads')
  return { success: true }
}
