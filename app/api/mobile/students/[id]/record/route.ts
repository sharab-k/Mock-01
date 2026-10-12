import { NextResponse } from 'next/server'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { fetchStudentRecord } from '@/lib/students/record'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const result = await fetchStudentRecord(id, auth.supabase)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Not authorized.' ? 403 : 404 })
  return NextResponse.json({ record: result.record })
}
