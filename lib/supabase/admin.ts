import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Service-role client — bypasses RLS entirely. Only ever import this from
// Server Actions / Route Handlers, never from a Client Component, never
// forward the key to the browser. The `server-only` import makes any
// accidental client-side import a build-time error, not a runtime leak.
//
// Use this ONLY for operations that genuinely need to bypass RLS by design
// (creating auth.users accounts via the Admin API, looking up an existing
// parent's profile by phone when the calling admissions_admin has no RLS
// policy granting them arbitrary profile reads). Prefer the regular
// lib/supabase/server.ts client — and let RLS itself be the authority —
// everywhere else.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
