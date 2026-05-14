import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

async function signout(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('mandato_rm')

  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`)
}

// GET — used by dashboard layout auto-logout redirect
export async function GET(request: NextRequest) {
  return signout(request)
}

// POST — used by the "Se déconnecter" button in settings
export async function POST(request: NextRequest) {
  return signout(request)
}
