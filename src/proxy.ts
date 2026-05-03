import { NextResponse, type NextRequest } from 'next/server'
import { PUBLIC_ROUTES } from '@/constants/routes'

// Optimistic session check via Supabase cookie — no network call, fully edge-safe.
// The real session verification (and token refresh) happens in the dashboard layout
// via createServerClient, which runs in the Node.js runtime, not the edge.
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes → always pass through
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request })
  }

  const isPublicPage = PUBLIC_ROUTES.includes(pathname)
  const hasSession = hasSessionCookie(request)

  // Protected route without session → redirect to login
  if (!isPublicPage && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already authenticated → redirect away from auth pages
  if (hasSession && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
