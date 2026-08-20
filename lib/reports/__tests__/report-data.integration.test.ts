// @vitest-environment node
//
// Phase 7 step 5: request a report for a student with no marks yet (empty
// state, must not crash) and for a student with entries across all three
// exam types (full aggregation) — against the live Supabase project, not
// mocked rows. This replicates fetchReportData's exact query shape using a
// plain supabase-js client instead of importing report-data.ts directly:
// that module pulls in lib/supabase/admin.ts, which `import 'server-only'`
// guards — the same reason no other test in this repo imports
// server-only-guarded app code directly (see Phase 3's notification test).
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'
import { groupMarksByExam, computeOverallAverage, computeTier, computeAttendanceSummary } from '../aggregate'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = Date.now()
const term = String(new Date().getFullYear())
let emptyStudentId = ''
let fullStudentId = ''

beforeAll(async () => {
  const { data: emptyStudent, error: emptyError } = await admin.from('students').insert({
    roll_number: `JE-TEST-RPT-EMPTY-${runId}`, registration_number: `JE-TEST-REG-RPT-EMPTY-${runId}`, academic_year: 2026, full_name: 'Report Test Empty Student', program: 'Matriculation', grade_level: '9', section: 'A',
  }).select('id').single()
  if (emptyError || !emptyStudent) throw emptyError ?? new Error('seed empty student insert returned no row')
  emptyStudentId = emptyStudent.id

  const { data: fullStudent, error: fullError } = await admin.from('students').insert({
    roll_number: `JE-TEST-RPT-FULL-${runId}`, registration_number: `JE-TEST-REG-RPT-FULL-${runId}`, academic_year: 2026, full_name: 'Report Test Full Student', program: 'Matriculation', grade_level: '10', section: 'B',
  }).select('id').single()
  if (fullError || !fullStudent) throw fullError ?? new Error('seed full student insert returned no row')
  fullStudentId = fullStudent.id

  await admin.from('marks').insert([
    { student_id: fullStudentId, subject: 'Mathematics', exam_type: 'monthly', score: 88, max_score: 100, term },
    { student_id: fullStudentId, subject: 'English', exam_type: 'monthly', score: 76, max_score: 100, term },
    { student_id: fullStudentId, subject: 'Mathematics', exam_type: 'half_yearly', score: 82, max_score: 100, term },
    { student_id: fullStudentId, subject: 'Mathematics', exam_type: 'final', score: 91, max_score: 100, term },
  ])
  await admin.from('attendance_records').insert([
    { student_id: fullStudentId, class_date: '2026-01-05', status: 'present' },
    { student_id: fullStudentId, class_date: '2026-01-06', status: 'late' },
    { student_id: fullStudentId, class_date: '2026-01-07', status: 'absent' },
  ])
}, 30_000)

afterAll(async () => {
  await admin.from('marks').delete().in('student_id', [emptyStudentId, fullStudentId])
  await admin.from('attendance_records').delete().in('student_id', [emptyStudentId, fullStudentId])
  await admin.from('students').delete().in('id', [emptyStudentId, fullStudentId])
}, 30_000)

async function fetchAndAggregate(studentId: string) {
  const { data: student } = await admin
    .from('students')
    .select('full_name, roll_number, grade_level, section, program')
    .eq('id', studentId)
    .is('deleted_at', null)
    .maybeSingle()

  const [attendanceRes, marksRes] = await Promise.all([
    admin.from('attendance_records').select('status').eq('student_id', studentId),
    admin.from('marks').select('subject, exam_type, score, max_score').eq('student_id', studentId).eq('term', term),
  ])

  const markRows = marksRes.data ?? []
  const overallAverage = computeOverallAverage(markRows)

  return {
    student,
    ...computeAttendanceSummary(attendanceRes.data ?? []),
    marksByExam: groupMarksByExam(markRows),
    overallAverage,
    tier: computeTier(overallAverage),
  }
}

describe('report data (live Supabase project)', () => {
  it('empty state: a student with no marks and no attendance produces a valid, non-crashing empty report', async () => {
    const report = await fetchAndAggregate(emptyStudentId)

    expect(report.student?.full_name).toBe('Report Test Empty Student')
    expect(report.marksByExam).toEqual([])
    expect(report.overallAverage).toBeNull()
    expect(report.tier).toBeNull()
    expect(report.attendancePct).toBeNull()
    expect(report.presentDays).toBe(0)
    expect(report.totalDays).toBe(0)
  })

  it('full aggregation: a student with entries across all three exam types groups and averages correctly', async () => {
    const report = await fetchAndAggregate(fullStudentId)

    expect(report.student?.full_name).toBe('Report Test Full Student')
    expect(report.marksByExam.map((g) => g.examType)).toEqual(['monthly', 'half_yearly', 'final'])
    expect(report.marksByExam[0].rows).toHaveLength(2) // 2 monthly entries
    expect(report.marksByExam[1].rows).toHaveLength(1)
    expect(report.marksByExam[2].rows).toHaveLength(1)

    // (88 + 76 + 82 + 91) / 4 = 84.25 -> rounds to 84
    expect(report.overallAverage).toBe(84)
    expect(report.tier).toBe('Distinction')

    // 1 present + 1 late attended, of 3 total -> 67%
    expect(report.attendancePct).toBe(67)
    expect(report.presentDays).toBe(2)
    expect(report.totalDays).toBe(3)
  })
})
