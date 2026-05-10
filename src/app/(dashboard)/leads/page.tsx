import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LeadsView } from '@/components/leads/leads-view'

export const metadata: Metadata = { title: 'Leads — Mandato' }

export default async function LeadsPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: sub }] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('plan').single(),
  ])

  const plan = (sub?.plan ?? 'starter') as 'starter' | 'pro' | 'agence'

  return <LeadsView leads={leads ?? []} plan={plan} />
}
