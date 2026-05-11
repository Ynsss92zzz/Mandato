import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SequenceEditor } from '@/components/sequences/sequence-editor'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  if (id === 'new') return { title: 'Nouvelle séquence — Mandato' }

  const supabase = await createClient()
  const { data } = await supabase.from('sequences').select('name').eq('id', id).single()
  return { title: `${data?.name ?? 'Séquence'} — Mandato` }
}

export default async function SequenceEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  let sequence = null
  let steps = null

  if (id !== 'new') {
    const { data: seq } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', id)
      .single()

    if (!seq) notFound()
    sequence = seq

    const { data: seqSteps } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', id)
      .order('step_order', { ascending: true })

    steps = seqSteps ?? []
  }

  const { data: templates } = await supabase
    .from('message_templates')
    .select('id, name, channel, subject, body')
    .order('name', { ascending: true })

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/sequences"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-[#1B2B4B] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux séquences
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">
          {id === 'new' ? 'Nouvelle séquence' : sequence?.name ?? 'Éditeur de séquence'}
        </h1>
        {id !== 'new' && (
          <p className="text-sm text-zinc-400 mt-1">
            Modifiez les étapes et glissez-déposez pour les réordonner
          </p>
        )}
      </div>

      <SequenceEditor
        sequenceId={id}
        sequence={sequence ?? undefined}
        initialSteps={steps ?? undefined}
        templates={templates ?? []}
      />
    </div>
  )
}
