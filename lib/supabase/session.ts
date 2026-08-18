import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createBearerClient } from '@/lib/supabase/bearer'
import type { Database } from '@/types/supabase'

// Resolves the caller's Supabase client from whichever session mechanism the
// request actually carries: a Bearer token (the mobile app) or the
// @supabase/ssr cookie session (the web app). Existing web requests never
// send an Authorization header, so this is a strict superset of the previous
// cookie-only behavior — used by the handful of Route Handlers shared
// between both clients (video heartbeat, PDF reports, notification resend).
export async function resolveRequestClient(request: Request): Promise<SupabaseClient<Database>> {
  const header = request.headers.get('authorization')
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]
  return token ? createBearerClient(token) : await createClient()
}
