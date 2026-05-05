'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const AvailabilitySchema = z.object({
  days:          z.array(z.number().int().min(0).max(6)).min(1),
  start_hour:    z.number().int().min(0).max(23),
  end_hour:      z.number().int().min(1).max(24),
  slot_duration: z.number().int().min(15).max(240),
  advance_days:  z.number().int().min(1).max(365),
})

export async function saveAvailability(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  if (!member) return { error: 'Agence introuvable' }

  const raw = {
    days:          formData.getAll('days').map(Number),
    start_hour:    Number(formData.get('start_hour')),
    end_hour:      Number(formData.get('end_hour')),
    slot_duration: Number(formData.get('slot_duration')),
    advance_days:  Number(formData.get('advance_days')),
  }

  const parsed = AvailabilitySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Données invalides', details: parsed.error.flatten() }
  }

  if (parsed.data.end_hour <= parsed.data.start_hour) {
    return { error: 'L\'heure de fin doit être supérieure à l\'heure de début' }
  }

  const { error } = await supabase
    .from('availability_settings')
    .upsert({
      agency_id:     member.agency_id,
      ...parsed.data,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'agency_id' })

  if (error) return { error: error.message }
  return { ok: true }
}
