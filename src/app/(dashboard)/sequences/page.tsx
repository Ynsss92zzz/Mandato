import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SequenceList } from '@/components/sequences/sequence-list'

export const metadata: Metadata = { title: 'Séquences — Mandato' }

export default async function SequencesPage() {
  const supabase = await createClient()

  const { data: sequences } = await supabase
    .from('sequences')
    .select('*')
    .order('created_at', { ascending: false })

  // Count steps per sequence
  const { data: stepCounts } = await supabase
    .from('sequence_steps')
    .select('sequence_id')

  const countMap: Record<string, number> = {}
  for (const row of stepCounts ?? []) {
    countMap[row.sequence_id] = (countMap[row.sequence_id] ?? 0) + 1
  }

  const sequencesWithCount = (sequences ?? []).map((s) => ({
    ...s,
    stepCount: countMap[s.id] ?? 0,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-navy">Séquences</h1>
          <span className="text-sm text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full font-medium">
            {sequencesWithCount.length}
          </span>
        </div>
        <Link
          href="/sequences/new"
          className="flex items-center gap-1.5 bg-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-light transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle séquence
        </Link>
      </div>

      <SequenceList sequences={sequencesWithCount} />
    </div>
  )
}
