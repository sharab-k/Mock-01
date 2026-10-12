import { NextResponse } from 'next/server'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { searchStudents } from '@/lib/students/record'

export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const q = new URL(request.url).searchParams.get('q') ?? ''
  const result = await searchStudents(q, auth.supabase)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Not authorized.' ? 403 : 400 })
  return NextResponse.json({ students: result.students })
}
