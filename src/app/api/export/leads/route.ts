import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Non autorisé', { status: 401 })

  const { data: leads } = await supabase
    .from('leads')
    .select('first_name, last_name, email, phone, status, source, budget, ai_score, created_at')
    .order('created_at', { ascending: false })

  const STATUS: Record<string, string> = {
    nouveau: 'Nouveau', contacte: 'Contacté', qualifie: 'Qualifié',
    rdv_planifie: 'RDV planifié', proposition: 'Proposition', gagne: 'Gagné', perdu: 'Perdu',
  }
  const SOURCE: Record<string, string> = {
    widget: 'Widget', seloger: 'SeLoger', leboncoin: 'Leboncoin',
    logicimmo: 'Logic-Immo', manuel: 'Manuel', import: 'Import', autre: 'Autre',
  }

  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Statut', 'Source', 'Budget (€)', 'Score IA', 'Créé le']

  const lines = [
    headers.map(q).join(';'),
    ...(leads ?? []).map(l => [
      l.first_name ?? '',
      l.last_name ?? '',
      l.email ?? '',
      l.phone ?? '',
      STATUS[l.status] ?? l.status,
      SOURCE[l.source] ?? l.source,
      l.budget ?? '',
      l.ai_score ?? '',
      l.created_at ? new Date(l.created_at).toLocaleDateString('fr-FR') : '',
    ].map(q).join(';')),
  ]

  return new Response('﻿' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-mandato-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
