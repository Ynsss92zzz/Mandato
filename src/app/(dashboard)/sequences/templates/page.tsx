import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TemplateList } from '@/components/sequences/template-list'

export const metadata: Metadata = { title: 'Templates — Mandato' }

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  let plan: 'starter' | 'pro' | 'agence' = 'starter'
  if (member?.agency_id) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('agency_id', member.agency_id)
      .single()
    if (sub?.plan) plan = sub.plan as typeof plan
  }

  const { data: templates } = await supabase
    .from('message_templates')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Templates de messages</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Modèles réutilisables avec variables dynamiques — {' '}
          <code className="font-mono text-xs bg-zinc-100 px-1 rounded">{'{{prénom}}'}</code>{', '}
          <code className="font-mono text-xs bg-zinc-100 px-1 rounded">{'{{bien}}'}</code>{', '}
          <code className="font-mono text-xs bg-zinc-100 px-1 rounded">{'{{budget}}'}</code>
        </p>
      </div>
      <TemplateList templates={templates ?? []} plan={plan} />
    </div>
  )
}
