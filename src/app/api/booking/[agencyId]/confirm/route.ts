import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationToLead, sendBookingNotificationToAgent } from '@/lib/resend'
import { z } from 'zod'

const BookingSchema = z.object({
  first_name: z.string().min(1),
  last_name:  z.string().optional(),
  email:      z.string().email(),
  phone:      z.string().optional(),
  message:    z.string().optional(),
  datetime:   z.string().datetime(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  const { agencyId } = await params
  const body = await request.json()

  const parsed = BookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { first_name, last_name, email, phone, message, datetime } = parsed.data
  const supabase = createAdminClient()

  // Verify slot is still available
  const slotStart = new Date(datetime)
  const slotEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000) // max 1h buffer

  const { data: conflict } = await supabase
    .from('appointments')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('scheduled_at', slotStart.toISOString())
    .not('status', 'eq', 'annule')
    .single()

  if (conflict) {
    return NextResponse.json({ error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' }, { status: 409 })
  }

  // Get availability settings for slot_duration
  const { data: avail } = await supabase
    .from('availability_settings')
    .select('slot_duration')
    .eq('agency_id', agencyId)
    .single()

  // Get agency info for email
  const { data: agency } = await supabase
    .from('agencies')
    .select('name, owner_id')
    .eq('id', agencyId)
    .single()

  // Get agent email
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', agency?.owner_id ?? '')
    .single()

  // Upsert lead
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('email', email)
    .single()

  let leadId: string

  if (existingLead) {
    leadId = existingLead.id
  } else {
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        agency_id:  agencyId,
        first_name,
        last_name:  last_name ?? null,
        email,
        phone:      phone ?? null,
        message:    message ?? null,
        source:     'widget',
        status:     'rdv_planifie',
      })
      .select('id')
      .single()

    if (leadError || !newLead) {
      return NextResponse.json({ error: 'Erreur lors de la création du contact' }, { status: 500 })
    }
    leadId = newLead.id
  }

  // Create appointment
  const durationMin = avail?.slot_duration ?? 60
  const { data: appointment, error: apptError } = await supabase
    .from('appointments')
    .insert({
      agency_id:    agencyId,
      lead_id:      leadId,
      title:        `RDV avec ${first_name}${last_name ? ' ' + last_name : ''}`,
      status:       'confirme',
      scheduled_at: slotStart.toISOString(),
      duration_min: durationMin,
    })
    .select('id')
    .single()

  if (apptError || !appointment) {
    return NextResponse.json({ error: 'Erreur lors de la création du rendez-vous' }, { status: 500 })
  }

  // Send emails (non-blocking)
  const agencyName = agency?.name ?? 'Mandato'
  const agentEmail = ownerProfile?.email
  const agentName  = ownerProfile?.full_name ?? agencyName

  const slotLabel = slotStart.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) + ' à ' + slotStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  await Promise.allSettled([
    sendBookingConfirmationToLead({
      to: email,
      leadName: first_name,
      agencyName,
      agentName,
      slotLabel,
      durationMin,
    }),
    agentEmail ? sendBookingNotificationToAgent({
      to: agentEmail,
      agentName,
      leadName: `${first_name}${last_name ? ' ' + last_name : ''}`,
      leadEmail: email,
      leadPhone: phone ?? null,
      slotLabel,
      durationMin,
    }) : Promise.resolve(),
  ])

  return NextResponse.json({ ok: true, appointmentId: appointment.id })
}
