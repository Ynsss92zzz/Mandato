import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { subscription } = await request.json() as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  }
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  if (!member?.agency_id) return NextResponse.json({ error: 'Agence introuvable' }, { status: 404 })

  await supabase
    .from('push_subscriptions')
    .upsert(
      {
        agency_id: member.agency_id,
        profile_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'profile_id,endpoint' },
    )

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { endpoint } = await request.json() as { endpoint: string }

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('profile_id', user.id)
    .eq('endpoint', endpoint)

  return NextResponse.json({ success: true })
}
