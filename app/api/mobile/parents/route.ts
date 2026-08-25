import { NextResponse } from 'next/server'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { fetchParentDirectory } from '@/lib/admissions/parent-lookup'

// fetchParentDirectory has no role check of its own (mirrors app/api/mobile/staff/route.ts's
// GET) — the web relies on the (super-admin) layout's requireRole gate, which doesn't exist
// for an API route, so it's enforced here instead before returning cross-account data.
export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: profile } = await auth.supabase.from('profiles').select('role').eq('id', auth.userId).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const parents = await fetchParentDirectory()
  return NextResponse.json({ parents })
}
