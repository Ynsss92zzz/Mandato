import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CopyButton } from '@/components/settings/copy-button'
import { Mail, Code2, Inbox } from 'lucide-react'

export const metadata: Metadata = { title: 'Intégrations' }

const CONTACT_EMAIL = 'mandatoimmo@gmail.com'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  const agencyId = member?.agency_id ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mandato-app.vercel.app'

  // Fetch plan to conditionally show email import (Pro+)
  const { data: subData } = agencyId
    ? await supabase.from('subscriptions').select('plan').eq('agency_id', agencyId).single()
    : { data: null }
  const plan = (subData?.plan ?? 'starter') as 'starter' | 'pro' | 'agence'

  // Fetch agency slug for the inbound email address
  const { data: agency } = agencyId
    ? await supabase.from('agencies').select('slug').eq('id', agencyId).single()
    : { data: null }

  const inboundEmail = agency?.slug ? `leads-${agency.slug}@mandato.fr` : null

  const scriptCode = `<!-- Widget Mandato -->
<script
  src="${appUrl}/widget.js"
  data-agency="${agencyId}"
  defer
></script>`

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Widget de capture</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Ajoutez un formulaire de contact sur votre site pour capturer des leads automatiquement.
        </p>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f0f3f9] rounded-xl flex items-center justify-center flex-none">
            <Code2 className="w-5 h-5 text-[#1B2B4B]" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800">Code à installer sur votre site</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Un seul copier-coller suffit</p>
          </div>
        </div>

        {/* Code block */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs text-zinc-600 leading-relaxed font-mono whitespace-pre">{scriptCode}</pre>
          </div>

          <CopyButton text={scriptCode} />

          {/* Reassuring message */}
          <div className="bg-[#f0f3f9] rounded-xl px-4 py-4 text-sm text-zinc-600 leading-relaxed">
            <p>
              <span className="font-medium text-[#1B2B4B]">Pas technique ?</span> Pas de problème.
              Envoyez ce code à votre webmaster — il saura quoi en faire.
              Ou contactez-nous directement et on s&apos;occupe de l&apos;installation pour vous.
            </p>
          </div>
        </div>
      </div>

      {/* Inbound email (Pro+) */}
      {(plan === 'pro' || plan === 'agence') && inboundEmail ? (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f0f3f9] rounded-xl flex items-center justify-center flex-none">
              <Inbox className="w-5 h-5 text-[#1B2B4B]" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-800">Import automatique par email</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Tout email reçu à cette adresse crée automatiquement un lead</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
              <code className="flex-1 text-sm font-mono text-[#1B2B4B]">{inboundEmail}</code>
              <CopyButton text={inboundEmail} />
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Transmettez cette adresse à vos portails immobiliers (SeLoger, Leboncoin…) pour qu&apos;ils envoient
              les notifications de contact directement ici. Chaque email devient un lead dans Mandato.
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
              Nécessite la configuration des MX de <strong>mandato.fr</strong> avec votre service email entrant (Resend, Mailgun, SendGrid).
              Contactez-nous pour l&apos;activation.
            </div>
          </div>
        </div>
      ) : plan === 'starter' ? (
        <div className="bg-white rounded-2xl border border-zinc-200 px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-zinc-800 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-zinc-400" />
              Import automatique par email
            </p>
            <p className="text-sm text-zinc-400 mt-0.5">Disponible à partir du plan Pro</p>
          </div>
          <a href="/settings/billing" className="text-sm font-medium text-[#FF6B35] hover:underline whitespace-nowrap">
            Passer au Pro →
          </a>
        </div>
      ) : null}

      {/* Contact card */}
      <div className="bg-white rounded-2xl border border-zinc-200 px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-zinc-800">On s&apos;en occupe pour vous</p>
          <p className="text-sm text-zinc-400 mt-0.5">
            Notre équipe installe le widget sur votre site, gratuitement.
          </p>
        </div>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Installation widget Mandato&body=Bonjour, je souhaite que vous installiez le widget Mandato sur mon site. Mon identifiant agence : ${agencyId}`}
          className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#FF8C5A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
        >
          <Mail className="w-4 h-4" />
          Nous contacter
        </a>
      </div>
    </div>
  )
}
