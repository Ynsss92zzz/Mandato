import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Non autorisé', { status: 401 })

  const { data: appts } = await supabase
    .from('appointments')
    .select('title, type, status, scheduled_at, duration_min, location, notes, lead_id')
    .order('scheduled_at', { ascending: false })

  const leadIds = [...new Set((appts ?? []).map(a => a.lead_id).filter(Boolean))] as string[]
  const leadMap: Record<string, string> = {}
  if (leadIds.length > 0) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, first_name, last_name')
      .in('id', leadIds)
    ;(leads ?? []).forEach(l => {
      leadMap[l.id] = [l.first_name, l.last_name].filter(Boolean).join(' ')
    })
  }

  const TYPE: Record<string, string> = { client: 'Client', personal: 'Personnel' }
  const STATUS: Record<string, string> = {
    planifie: 'Planifié', confirme: 'Confirmé', annule: 'Annulé', effectue: 'Effectué',
  }

  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const headers = ['Titre', 'Type', 'Statut', 'Date', 'Durée (min)', 'Lieu', 'Lead associé', 'Notes']

  const lines = [
    headers.map(q).join(';'),
    ...(appts ?? []).map(a => [
      a.title ?? '',
      TYPE[a.type ?? ''] ?? a.type ?? '',
      STATUS[a.status ?? ''] ?? a.status ?? '',
      a.scheduled_at ? new Date(a.scheduled_at).toLocaleString('fr-FR') : '',
      a.duration_min ?? '',
      a.location ?? '',
      a.lead_id ? (leadMap[a.lead_id] ?? '') : '',
      a.notes ?? '',
    ].map(q).join(';')),
  ]

  return new Response('﻿' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rdv-mandato-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
