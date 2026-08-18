import { NextResponse } from 'next/server'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { fetchAuditLog } from '@/lib/audit/fetch'

// fetchAuditLog has no role check of its own either (same rationale as the
// staff directory route) — enforced here since audit_log's contents are
// exactly the kind of thing that must never leak to a non-super_admin
// caller, RLS or not.
export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: profile } = await auth.supabase.from('profiles').select('role').eq('id', auth.userId).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const limitParam = new URL(request.url).searchParams.get('limit')
  const limit = limitParam ? Math.min(Number(limitParam) || 200, 200) : 200
  const entries = await fetchAuditLog(limit)
  return NextResponse.json({ entries })
}
