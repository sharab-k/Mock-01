import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Exchanges the PKCE `code` from a Supabase auth email link (password
// recovery today) for a session, then hands off to `next` — e.g.
// /reset-password, which relies on the session cookie set here.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/reset-password'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=reset_link_invalid`)
}
