import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { PushProvider } from '@/components/dashboard/push-provider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Redirect to onboarding if not yet completed
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  // Requête 1 : récupérer l'agence du user
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id, role, agencies(id, name)')
    .eq('profile_id', user.id)
    .single()

  const agencyId = member?.agency_id ?? null
  const agencyData = member?.agencies as { id: string; name: string } | null
  const agencyName = agencyData?.name ?? 'Mon agence'

  // Requête 2 : récupérer le plan de l'agence
  let plan: 'starter' | 'pro' | 'agence' = 'starter'
  if (agencyId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('agency_id', agencyId)
      .single()
    if (sub?.plan) plan = sub.plan
  }

  const userName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Utilisateur'
  const userEmail = user.email ?? ''

  return (
    <div className="flex h-screen bg-[#f0f3f9] overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
      <div className="print:hidden">
        <Sidebar agencyName={agencyName} plan={plan} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 print:overflow-visible">
        <div className="print:hidden">
          <TopBar userName={userName} userEmail={userEmail} />
        </div>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>

      {(plan === 'pro' || plan === 'agence') && <PushProvider />}
    </div>
  )
}
