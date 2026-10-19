import { NextResponse } from 'next/server'
import { resolveRequestClient } from '@/lib/supabase/session'
import { processMarksUpload, type ExamType } from '@/lib/marks/upload'

// Reading and saving a whole school's results can take a while.
export const maxDuration = 300

const EXAM_TYPES: ExamType[] = ['monthly', 'half_yearly', 'final']

// Marks spreadsheet upload. Shared by the website (cookie session) and the
// phone app (Bearer token). Only marks_admin / super_admin may call it; the
// writes run on the caller's own RLS-scoped session.
//
// Form fields: file, examType (monthly | half_yearly | final — chosen in the
// popup), dryRun ("1" = check the file and report, write nothing), notify
// ("1" = send parents their result notices).
export async function POST(request: Request) {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['marks_admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })

  const examType = String(form?.get('examType') ?? '') as ExamType
  if (!EXAM_TYPES.includes(examType)) return NextResponse.json({ error: 'Choose the exam: Monthly, Half-Yearly or Final.' }, { status: 400 })

  const outcome = await processMarksUpload(supabase, file, {
    examType,
    dryRun: form?.get('dryRun') === '1',
    notify: form?.get('notify') === '1',
  })
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 400 })
  return NextResponse.json(outcome.result)
}
