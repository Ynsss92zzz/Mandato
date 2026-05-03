import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { qualifyLead } from '@/lib/ai/qualify-lead'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = await request.json() as { lead_id?: string }
  const leadId = body.lead_id

  if (!leadId) {
    return NextResponse.json({ error: 'lead_id requis' }, { status: 400 })
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  }

  let analysis
  try {
    analysis = await qualifyLead({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      source: lead.source,
      budget: lead.budget,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }

  const { error } = await supabase
    .from('leads')
    .update({
      ai_score: analysis.score,
      ai_analysis: analysis as unknown as Database['public']['Tables']['leads']['Row']['ai_analysis'],
    })
    .eq('id', leadId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ analysis })
}
