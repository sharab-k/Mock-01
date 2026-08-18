import { NextResponse } from 'next/server'
import { callMobileAction } from '@/lib/api/mobile-handler'
import { createStaffAction } from '@/lib/actions/staff'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { fetchStaffDirectory } from '@/lib/staff/fetch'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    createStaffAction(body as Parameters<typeof createStaffAction>[0], supabase),
  )
}

// fetchStaffDirectory has no role check of its own — the web relies on the
// (super-admin) layout's requireRole gate, which doesn't exist for an API
// route, so it's enforced here instead before returning cross-account data.
export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: profile } = await auth.supabase.from('profiles').select('role').eq('id', auth.userId).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const staff = await fetchStaffDirectory()
  return NextResponse.json({ staff })
}
