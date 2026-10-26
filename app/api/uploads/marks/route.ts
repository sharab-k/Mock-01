import { NextResponse } from 'next/server'
import { resolveRequestClient } from '@/lib/supabase/session'
import { processMarksUpload, type ExamType } from '@/lib/marks/upload'

// One database call per 500 marks, so even a whole school's results save in seconds.
export const maxDuration = 60

const EXAM_TYPES: ExamType[] = ['monthly', 'half_yearly', 'final']

// Marks spreadsheet upload. Shared by the website (cookie session) and the
// phone app (Bearer token). Only marks_admin / super_admin may call it; the
// writes run on the caller's own RLS-scoped session.
//
// Form fields: file, examType (monthly | half_yearly | final — chosen in the
// popup), dryRun ("1" = check the file and report, write nothing), notify
// ("1" = send parents their result notices), examMonth (optional YYYY-MM —
// the month the exam was held in; marks dated elsewhere are refused).
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

  const monthRaw = String(form?.get('examMonth') ?? '')
  if (monthRaw && !/^d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) return NextResponse.json({ error: 'The exam month is not valid.' }, { status: 400 })

  const outcome = await processMarksUpload(supabase, user.id, file, {
    examType,
    dryRun: form?.get('dryRun') === '1',
    notify: form?.get('notify') === '1',
    examMonth: monthRaw || null,
  })
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 400 })
  return NextResponse.json(outcome.result)
}
