import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoEnrollNewLead } from '@/lib/sequences/auto-enroll'

// Endpoint public pour recevoir les leads depuis le widget embed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agency_id, first_name, last_name, email, phone, message, source } = body

    if (!agency_id || !first_name) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('leads')
      .insert({
        agency_id,
        first_name,
        last_name: last_name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        message: message ?? null,
        source: source ?? 'widget',
        status: 'nouveau',
        tags: [],
      })
      .select('id')
      .single()

    if (error) throw error

    // Trigger sequences with trigger_on='lead_created' — fire-and-forget
    autoEnrollNewLead(agency_id, data.id).catch((err) =>
      console.error('[widget] auto-enroll failed', err)
    )

    return NextResponse.json({ success: true, lead_id: data.id })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// CORS pour le widget embed (ouvert à tous les domaines)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
