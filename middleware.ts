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

  // IMPORTANT: this call refreshes the session — do not remove it, and do not
  // add logic between createServerClient and this call.
  const { data: { user } } = await supabase.auth.getUser()

  const isEntryPage = request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login'

  if (user && isEntryPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
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
