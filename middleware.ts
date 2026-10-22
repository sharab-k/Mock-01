import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { ROLE_DESTINATIONS } from '@/lib/auth/role-destinations'

// Every app/api/mobile/** route is bearer-token authenticated, never
// cookie-based, so a wildcard CORS origin doesn't weaken it the way it would
// for a cookie-authenticated route — a cross-origin page still can't forge a
// valid Authorization header. Wide open here specifically so the Expo web
// preview build (served from a completely different *.expo.app origin) can
// actually reach these routes for testing, instead of every request being
// silently blocked by the browser before it's ever sent — the native app
// isn't a browser and was never subject to this in the first place, which is
// why this only ever showed up when testing through the web preview link.
function withMobileApiCors(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return response
}

// The `sub` (user id) claim of a JWT, read without verifying it — see the note at
// its use below. Reading it directly avoids the library's "insecure session.user"
// warning on every request.
function jwtSubject(token: string): string | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const sub = (JSON.parse(atob(payload)) as { sub?: unknown }).sub
    return typeof sub === 'string' ? sub : null
  } catch {
    return null
  }
}

// Refreshes the Supabase session cookie on every matched request and, as a
// convenience only, bounces an already-signed-in user away from / or /login
// into their own portal root. This is NOT the access boundary — role gating
// for protected routes lives in each route group's layout.tsx, and the real
// boundary is RLS. See CLAUDE.md §4 and golden rule 8.
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/mobile')) {
    if (request.method === 'OPTIONS') return withMobileApiCors(new NextResponse(null, { status: 204 }))
    return withMobileApiCors(NextResponse.next({ request }))
  }

  // Visitors with no Supabase session cookie (the whole public site, the login
  // page for signed-out people) need nothing from Supabase: skip it entirely
  // instead of paying a round trip to the database region on every page view.
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
  if (!hasSession) return NextResponse.next({ request })

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: this call refreshes the session cookie when it is close to
  // expiring — do not remove it, and do not add logic between createServerClient
  // and this call. getSession() reads the cookie locally (no network unless a
  // refresh is due); it does not VALIDATE the token, which is fine here because
  // this middleware is only UX (cookie refresh + the portal redirect below).
  // Every page layout re-verifies with getUser(), and the database (RLS)
  // rejects an invalid token on every query.
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session ? jwtSubject(session.access_token) : null

  const isEntryPage = request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login'

  if (userId && isEntryPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const destination = profile ? ROLE_DESTINATIONS[profile.role] : undefined

    if (destination) {
      const url = request.nextUrl.clone()
      url.pathname = destination
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/api/mobile/:path*',
  ],
}
