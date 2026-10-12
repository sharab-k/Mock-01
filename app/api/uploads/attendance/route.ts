import { NextResponse } from 'next/server'
import { resolveRequestClient } from '@/lib/supabase/session'
import { readSheet } from '@/lib/uploads/sheet'
import { processAttendanceUpload } from '@/lib/attendance/upload'

export const maxDuration = 60

// Attendance spreadsheet upload. Shared by the website (cookie session) and the
// phone app (Bearer token). Only attendance_admin / super_admin may call it.
export async function POST(request: Request) {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['attendance_admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })

  const sheet = await readSheet(file)
  if (!sheet.ok) return NextResponse.json({ error: sheet.error }, { status: 400 })

  return NextResponse.json(await processAttendanceUpload(supabase, user.id, sheet.rows))
}
