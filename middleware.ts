import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { ROLE_DESTINATIONS } from '@/lib/auth/role-destinations'

// Refreshes the Supabase session cookie on every matched request and, as a
// convenience only, bounces an already-signed-in user away from / or /login
// into their own portal root. This is NOT the access boundary — role gating
// for protected routes lives in each route group's layout.tsx, and the real
// boundary is RLS. See CLAUDE.md §4 and golden rule 8.
export async function middleware(request: NextRequest) {
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
  ],
}
