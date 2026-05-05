'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PersonalAppointmentSchema = z.object({
  title:        z.string().min(1, 'Le titre est requis').max(200),
  category:     z.enum(['reunion_interne', 'visite_terrain', 'formation', 'autre']),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  time:         z.string().regex(/^\d{2}:\d{2}$/, 'Heure invalide'),
  duration_min: z.coerce.number().int().min(15).max(480),
  notes:        z.string().max(1000).optional(),
})

export async function createPersonalAppointment(
  formData: FormData,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  if (!member) return { error: 'Agence introuvable' }

  const parsed = PersonalAppointmentSchema.safeParse({
    title:        formData.get('title'),
    category:     formData.get('category'),
    date:         formData.get('date'),
    time:         formData.get('time'),
    duration_min: formData.get('duration_min'),
    notes:        formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return { error: first?.message ?? 'Données invalides' }
  }

  const { title, category, date, time, duration_min, notes } = parsed.data
  const scheduled_at = new Date(`${date}T${time}:00`).toISOString()

  const { error } = await supabase.from('appointments').insert({
    agency_id:    member.agency_id,
    title,
    type:         'personal',
    category,
    status:       'confirme',
    scheduled_at,
    duration_min,
    notes:        notes ?? null,
    lead_id:      null,
  })

  if (error) return { error: error.message }

  revalidatePath('/appointments')
  return { ok: true }
}

export async function deleteAppointment(
  id: string,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  if (!member) return { error: 'Agence introuvable' }

  const { data: deleted, error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('agency_id', member.agency_id)
    .select('id')

  if (error) {
    console.error('[deleteAppointment] error', { id, message: error.message, code: error.code })
    return { error: error.message }
  }
  if (!deleted || deleted.length === 0) {
    console.error('[deleteAppointment] 0 rows deleted — RLS block or wrong id', { id, agency_id: member.agency_id })
    return { error: 'Rendez-vous introuvable ou accès refusé' }
  }

  revalidatePath('/appointments')
  return { ok: true }
}
