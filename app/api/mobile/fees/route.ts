import { NextResponse } from 'next/server'
import { callMobileAction } from '@/lib/api/mobile-handler'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { fetchFeeRoster } from '@/lib/fees/roster'
import { setFeeStatusAction } from '@/lib/actions/fees'

// fetchFeeRoster has no role check of its own (mirrors app/api/mobile/staff/route.ts's GET)
// — enforced here since there's no (super-admin) layout guard for an API route.
export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: profile } = await auth.supabase.from('profiles').select('role').eq('id', auth.userId).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const url = new URL(request.url)
  const now = new Date()
  const year = Number(url.searchParams.get('year') ?? now.getFullYear())
  const month = Number(url.searchParams.get('month') ?? now.getMonth() + 1)

  const students = await fetchFeeRoster(year, month, auth.supabase)
  return NextResponse.json({ students })
}

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    setFeeStatusAction(body as Parameters<typeof setFeeStatusAction>[0], supabase),
  )
}
