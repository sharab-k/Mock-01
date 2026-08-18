import 'server-only'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import type { Database } from '@/types/supabase'

type ActionResult = { ok: true } & Record<string, unknown> | { ok: false; error: string }

// Shared shape for every app/api/mobile/** route: bearer-authenticate, parse
// the JSON body, run the existing lib/actions/* function against the
// bearer-scoped client, and translate its {ok:false,error} shape into an
// HTTP response. Authorization itself stays inside each action's own
// requireXCaller() — this never re-implements it.
export async function callMobileAction<T extends ActionResult>(
  request: Request,
  run: (body: unknown, supabase: SupabaseClient<Database>) => Promise<T>,
): Promise<NextResponse> {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const result = await run(body, auth.supabase)

  if (!result.ok) {
    const status = /not (authorized|signed in)/i.test(result.error) ? 403 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json(result)
}
