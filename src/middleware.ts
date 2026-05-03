import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PUBLIC_ROUTES, AGENCE_ONLY_ROUTES } from '@/constants/routes'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Rafraîchir la session — obligatoire, ne pas supprimer
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Route API publique (widget embed, webhooks) → toujours passer
  if (
    pathname.startsWith('/api/widget') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/auth')
  ) {
    return supabaseResponse
  }

  const isPublicPage = PUBLIC_ROUTES.includes(pathname)

  // Route protégée sans session → redirection login
  if (!isPublicPage && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Déjà connecté → redirection dashboard depuis les pages auth
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow logged-in users to access onboarding (needed for first-time setup)
  if (user && pathname === '/onboarding') {
    return supabaseResponse
  }

  // Routes réservées au plan Agence — vérification du plan en DB
  if (user && AGENCE_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    // Récupérer l'agency_id via agency_members, puis le plan
    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('profile_id', user.id)
      .single()

    if (member?.agency_id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('agency_id', member.agency_id)
        .single()

      if (!sub || sub.plan !== 'agence') {
        return NextResponse.redirect(new URL('/settings/billing?upgrade=agence', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
