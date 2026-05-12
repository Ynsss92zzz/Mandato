import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Route Handler — can write cookies, unlike Server Component layouts.
// The dashboard layout redirects here when mandato_rm is absent (browser was closed without "remember me").
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('mandato_rm')

  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`)
}
