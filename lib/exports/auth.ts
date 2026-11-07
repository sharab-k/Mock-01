import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveRequestClient } from '@/lib/supabase/session'
import type { Database } from '@/types/supabase'

/**
 * Checks who is asking before an export is built: signed in, and one of the allowed roles. Row-level security
 * still limits what the caller's own client can read; this only fails fast with a clear status.
 */
export async function requireExportRole(
  request: Request,
  roles: readonly string[],
): Promise<{ ok: true; supabase: SupabaseClient<Database>; userId: string } | { ok: false; response: NextResponse }> {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !roles.includes(profile.role)) return { ok: false, response: NextResponse.json({ error: 'Not authorized.' }, { status: 403 }) }
  return { ok: true, supabase, userId: user.id }
}

export function xlsxResponse(bytes: Buffer, fileName: string, mime: string) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
