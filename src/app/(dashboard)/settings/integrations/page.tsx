import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { WidgetIntegration } from '@/components/settings/widget-integration'

export const metadata: Metadata = { title: 'Intégrations' }

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

  const { data: widgetConfig } = await supabase
    .from('widget_configs')
    .select('id, primary_color, button_text, title, allowed_domains')
    .eq('agency_id', agencyId)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.mandato.fr'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B2B4B]">Intégrations</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Connectez Mandato à vos outils et ajoutez le widget sur votre site</p>
      </div>

      <WidgetIntegration
        agencyId={agencyId}
        widgetId={widgetConfig?.id ?? null}
        primaryColor={widgetConfig?.primary_color ?? '#FF6B35'}
        welcomeMessage={widgetConfig?.title ?? 'Bonjour ! Comment puis-je vous aider ?'}
        allowedDomains={(widgetConfig?.allowed_domains as string[] | null) ?? []}
        appUrl={appUrl}
      />
    </div>
  )
}
