import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { fetchClassRoster } from '@/lib/attendance/roster'

const QuerySchema = z.object({
  grade: z.enum(['9', '10', '11', '12', 'ICOM-1', 'ICOM-2']),
  // Reads an existing class — accepts any valid code across both schemes
  // (A-E for 11-12/ICOM-1/ICOM-2, G1-G3/B1-B3 for 9-10) without re-validating
  // the pairing, which is an enrolment-time rule.
  section: z.enum(['A', 'B', 'C', 'D', 'E', 'G1', 'G2', 'G3', 'B1', 'B2', 'B3']),
})

// Read-only GET counterpart to Phase 0's mobile write routes — needed
// because fetchClassRoster enriches with parent phone/alert status via the
// service-role client (lib/supabase/admin.ts), which must never ship to a
// mobile bundle. The mobile app fetches everything else in this app
// directly against Supabase with RLS; this one read stays server-mediated.
export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(request.url)
  const parsed = QuerySchema.safeParse({ grade: url.searchParams.get('grade'), section: url.searchParams.get('section') })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid grade/section.' }, { status: 400 })

  const roster = await fetchClassRoster(parsed.data.grade, parsed.data.section, auth.supabase)
  return NextResponse.json({ roster })
}
