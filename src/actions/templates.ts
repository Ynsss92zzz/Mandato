'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAgencyId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', userId)
    .single()
  return data?.agency_id ?? null
}

export async function createTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { error } = await supabase
    .from('message_templates')
    .insert({
      agency_id: agencyId,
      name: formData.get('name') as string,
      channel: formData.get('channel') as 'email' | 'sms' | 'whatsapp',
      subject: (formData.get('subject') as string | null) || null,
      body: formData.get('body') as string,
    })

  if (error) return { error: error.message }
  revalidatePath('/sequences/templates')
  return { success: true }
}

export async function updateTemplate(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { error } = await supabase
    .from('message_templates')
    .update({
      name: formData.get('name') as string,
      channel: formData.get('channel') as 'email' | 'sms' | 'whatsapp',
      subject: (formData.get('subject') as string | null) || null,
      body: formData.get('body') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('agency_id', agencyId)

  if (error) return { error: error.message }
  revalidatePath('/sequences/templates')
  return { success: true }
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const agencyId = await getAgencyId(supabase, user.id)
  if (!agencyId) return { error: 'Agence introuvable' }

  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId)

  if (error) return { error: error.message }
  revalidatePath('/sequences/templates')
  return { success: true }
}
