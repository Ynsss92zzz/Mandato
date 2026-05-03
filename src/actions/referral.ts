'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'

async function getAgencyContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  if (!member) return null
  return { userId: user.id, agencyId: member.agency_id }
}

export async function getReferralInfo() {
  const supabase = await createClient()
  const ctx = await getAgencyContext(supabase)
  if (!ctx) return { error: 'Non authentifié' }

  const { data: agency } = await supabase
    .from('agencies')
    .select('referral_code')
    .eq('id', ctx.agencyId)
    .single()

  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, used_at, reward_applied_at, referee_agency_id')
    .eq('referrer_agency_id', ctx.agencyId)
    .order('used_at', { ascending: false })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'
  const code = agency?.referral_code ?? null

  return {
    code,
    link: code ? `${appUrl}/register?ref=${code}` : null,
    referrals: referrals ?? [],
    totalReferrals: (referrals ?? []).length,
    rewardedMonths: (referrals ?? []).filter((r) => r.reward_applied_at).length,
  }
}

export async function applyReferralCode(code: string) {
  const supabase = await createClient()
  const ctx = await getAgencyContext(supabase)
  if (!ctx) return { error: 'Non authentifié' }

  if (!code.trim()) return { error: 'Code invalide' }

  const normalizedCode = code.trim().toUpperCase()

  // Find the referrer agency by code
  const { data: referrerAgency } = await supabase
    .from('agencies')
    .select('id')
    .eq('referral_code', normalizedCode)
    .single()

  if (!referrerAgency) return { error: 'Code de parrainage invalide' }

  // Can't refer yourself
  if (referrerAgency.id === ctx.agencyId) {
    return { error: 'Vous ne pouvez pas utiliser votre propre code de parrainage' }
  }

  // Check if already applied (unique constraint on referee_agency_id)
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referee_agency_id', ctx.agencyId)
    .single()

  if (existing) return { error: 'Vous avez déjà utilisé un code de parrainage' }

  // Create referral record
  const { error } = await supabase.from('referrals').insert({
    referrer_agency_id: referrerAgency.id,
    referee_agency_id: ctx.agencyId,
    reward_applied_at: null,
  })

  if (error) return { error: 'Erreur lors de l\'application du code' }

  // Extend referee trial by 30 days (update subscriptions.trial_ends_at)
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 30)

  await supabase
    .from('subscriptions')
    .update({ trial_ends_at: trialEnd.toISOString() })
    .eq('agency_id', ctx.agencyId)
    .eq('status', 'trialing')

  // Notify referrer by email
  const { data: referrerMembers } = await supabase
    .from('agency_members')
    .select('profile_id')
    .eq('agency_id', referrerAgency.id)
    .eq('role', 'owner')

  if (referrerMembers?.length) {
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', referrerMembers[0].profile_id)
      .single()

    if (referrerProfile?.email) {
      await sendEmail({
        to: referrerProfile.email,
        subject: 'Bonne nouvelle — votre filleul vient de s\'inscrire sur Mandato !',
        text: `Bonjour ${referrerProfile.full_name ?? ''},\n\nUn nouveau filleul vient d'utiliser votre code de parrainage et s'est inscrit sur Mandato.\n\nVous allez recevoir 1 mois offert sur votre prochain renouvellement.\n\nMerci de recommander Mandato !\n\nL'équipe Mandato`,
      })

      // Mark reward as applied for referrer
      await supabase
        .from('referrals')
        .update({ reward_applied_at: new Date().toISOString() })
        .eq('referrer_agency_id', referrerAgency.id)
        .eq('referee_agency_id', ctx.agencyId)
    }
  }

  revalidatePath('/settings/referral')
  return { success: true, message: 'Code appliqué ! Votre essai est étendu à 30 jours.' }
}

export async function completeOnboarding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id)

  if (error) return { error: 'Erreur lors de la sauvegarde' }

  return { success: true }
}
