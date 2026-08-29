'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import { GRADES } from '@/lib/students/constants'
import type { Database } from '@/types/supabase'

async function requireMarksCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const authorized = !!profile && ['marks_admin', 'super_admin'].includes(profile.role)
  return { supabase, userId: user.id, authorized }
}

export type TestSummary = {
  id: string
  subjectId: string
  subjectName: string
  gradeLevel: string
  section: string
  title: string
  maxScore: number
  testDate: string
  entriesCount: number
}

// Every test Marks Admin has ever created, newest first — the Tests list
// screen filters/groups this client-side rather than round-tripping per
// grade/section, same shape as fetchSubjects.
export async function fetchTests(supabaseOverride?: SupabaseClient<Database>): Promise<TestSummary[]> {
  const supabase = supabaseOverride ?? await createClient()
  const [testsRes, marksRes] = await Promise.all([
    supabase.from('tests').select('id, subject_id, grade_level, section, title, max_score, test_date, subjects(name)').order('test_date', { ascending: false }),
    supabase.from('marks').select('test_id').not('test_id', 'is', null),
  ])

  const countByTest = new Map<string, number>()
  for (const row of marksRes.data ?? []) {
    if (!row.test_id) continue
    countByTest.set(row.test_id, (countByTest.get(row.test_id) ?? 0) + 1)
  }

  return (testsRes.data ?? []).map((t) => ({
    id: t.id,
    subjectId: t.subject_id,
    subjectName: t.subjects?.name ?? '—',
    gradeLevel: t.grade_level,
    section: t.section,
    title: t.title,
    maxScore: t.max_score,
    testDate: t.test_date,
    entriesCount: countByTest.get(t.id) ?? 0,
  }))
}

const CreateTestSchema = z.object({
  subjectId: z.string().uuid(),
  gradeLevel: z.enum(GRADES as [string, ...string[]]),
  section: z.string().min(1).max(10),
  title: z.string().min(1).max(150),
  maxScore: z.number().int().min(1).max(1000),
  testDate: z.string().optional(),
})

export async function createTestAction(
  input: z.infer<typeof CreateTestSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = CreateTestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid test details.' }

  const { supabase, userId, authorized } = await requireMarksCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { subjectId, gradeLevel, section, title, maxScore, testDate } = parsed.data

  const { data: subject } = await supabase.from('subjects').select('name, grade_level').eq('id', subjectId).is('deleted_at', null).single()
  if (!subject) return { ok: false, error: 'Subject not found.' }
  if (subject.grade_level !== gradeLevel) return { ok: false, error: `${subject.name} isn't offered in Grade ${gradeLevel}.` }

  const { data, error } = await supabase
    .from('tests')
    .insert({
      subject_id: subjectId,
      grade_level: gradeLevel,
      section,
      title,
      max_score: maxScore,
      test_date: testDate,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: 'Could not create the test. Please try again.' }

  await logAction(supabase, userId, `Created test — ${title} · ${subject.name} · Grade ${gradeLevel}-${section}`)
  return { ok: true, id: data.id }
}

export type TestRosterStudent = { id: string; fullName: string; rollNumber: string; score: number | null }

// The roster for a specific test's marks-entry screen — for a compulsory
// subject that's every active student in the class; for an elected subject
// it's only the students actually enrolled (CLAUDE.md's whole point of the
// elected/compulsory split), each with whatever score is already recorded
// for this exact test_id.
export async function fetchTestRoster(
  testId: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; test: TestSummary; roster: TestRosterStudent[] } | { ok: false; error: string }> {
  const supabase = supabaseOverride ?? await createClient()

  const { data: test } = await supabase
    .from('tests')
    .select('id, subject_id, grade_level, section, title, max_score, test_date, subjects(name, type)')
    .eq('id', testId)
    .single()
  if (!test) return { ok: false, error: 'Test not found.' }

  const studentsQuery = supabase
    .from('students')
    .select('id, full_name, roll_number')
    .is('deleted_at', null)
    .eq('status', 'active')
    .eq('grade_level', test.grade_level)
    .eq('section', test.section)
    .order('roll_number', { ascending: true })

  const [studentsRes, enrolledRes, marksRes] = await Promise.all([
    studentsQuery,
    test.subjects?.type === 'elected'
      ? supabase.from('student_subject_enrollments').select('student_id').eq('subject_id', test.subject_id)
      : Promise.resolve({ data: null }),
    supabase.from('marks').select('student_id, score').eq('test_id', testId),
  ])

  const scoreByStudent = new Map((marksRes.data ?? []).map((m) => [m.student_id, m.score]))
  const eligibleIds = test.subjects?.type === 'elected' ? new Set((enrolledRes.data ?? []).map((r) => r.student_id)) : null

  const roster = (studentsRes.data ?? [])
    .filter((s) => !eligibleIds || eligibleIds.has(s.id))
    .map((s) => ({
      id: s.id,
      fullName: s.full_name,
      rollNumber: s.roll_number,
      score: scoreByStudent.get(s.id) ?? null,
    }))

  return {
    ok: true,
    test: {
      id: test.id,
      subjectId: test.subject_id,
      subjectName: test.subjects?.name ?? '—',
      gradeLevel: test.grade_level,
      section: test.section,
      title: test.title,
      maxScore: test.max_score,
      testDate: test.test_date,
      entriesCount: roster.filter((r) => r.score !== null).length,
    },
    roster,
  }
}
