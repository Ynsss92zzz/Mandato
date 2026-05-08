import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ leads: [], appointments: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const [leadsRes, apptRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, first_name, last_name, email, status')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('appointments')
      .select('id, title, scheduled_at')
      .ilike('title', `%${q}%`)
      .limit(3),
  ])

  return NextResponse.json({
    leads: leadsRes.data ?? [],
    appointments: apptRes.data ?? [],
  })
}
