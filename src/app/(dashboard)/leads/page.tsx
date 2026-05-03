import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LeadsView } from '@/components/leads/leads-view'

export const metadata: Metadata = { title: 'Leads — Mandato' }

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return <LeadsView leads={leads ?? []} />
}
