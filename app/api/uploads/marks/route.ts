import { NextResponse } from 'next/server'
import { resolveRequestClient } from '@/lib/supabase/session'
import { readSheet } from '@/lib/uploads/sheet'
import { processMarksUpload } from '@/lib/marks/upload'

export const maxDuration = 60

// Marks spreadsheet upload. Shared by the website (cookie session) and the
// phone app (Bearer token). Only marks_admin / super_admin may call it; the
// per-row writes then run on the caller's own RLS-scoped session.
export async function POST(request: Request) {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['marks_admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })

  const sheet = await readSheet(file)
  if (!sheet.ok) return NextResponse.json({ error: sheet.error }, { status: 400 })

  return NextResponse.json(await processMarksUpload(supabase, sheet.rows))
}
