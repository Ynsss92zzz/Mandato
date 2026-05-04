import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LeadDetail } from '@/components/leads/lead-detail'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select('first_name, last_name')
    .eq('id', id)
    .single()

  const name = data ? `${data.first_name} ${data.last_name ?? ''}`.trim() : 'Lead'
  return { title: `${name} — Mandato` }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-[#1B2B4B] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux leads
        </Link>
      </div>
      <LeadDetail lead={lead} />
    </div>
  )
}
