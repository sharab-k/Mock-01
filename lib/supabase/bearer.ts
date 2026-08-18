import 'server-only'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Bearer-token client for the mobile app. Route Handlers hit by the native
// client carry `Authorization: Bearer <access_token>` instead of the cookie
// session @supabase/ssr expects (lib/supabase/server.ts), so this binds the
// anon-key client's requests to that token directly. RLS is enforced exactly
// the same as the cookie-based web client — this is NOT a service-role
// bypass (contrast lib/supabase/admin.ts).
export function createBearerClient(accessToken: string): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
}

export type BearerAuthResult =
  | { ok: true; supabase: SupabaseClient<Database>; userId: string }
  | { ok: false; error: string; status: number }

// Shared entry point for every app/api/mobile/** route (and the bearer
// fallback on the pre-existing shared routes) — extracts the token, verifies
// it against Supabase Auth, and hands back an RLS-scoped client bound to
// that user. Role checks stay in each action's own requireXCaller(), same as
// the web path, so authorization logic is never duplicated here.
export async function authenticateBearerRequest(request: Request): Promise<BearerAuthResult> {
  const header = request.headers.get('authorization')
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return { ok: false, error: 'Missing bearer token.', status: 401 }

  const supabase = createBearerClient(token)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { ok: false, error: 'Invalid or expired session.', status: 401 }

  return { ok: true, supabase, userId: user.id }
}
