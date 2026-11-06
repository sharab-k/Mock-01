// @vitest-environment node
//
// Live: First Year subject-wise attendance against the dev server + real Supabase
// project, called with real role JWTs (Bearer) on the same route the phone app
// uses. One student can have a row per subject per day; only students who study
// the subject can be marked for it; an absence names the subject in the parent's
// notice; whole-day records for other grades are untouched.
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP = process.env.CARD_TEST_URL ?? 'http://localhost:3000'

const admin = createClient<Database>(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
const runId = Date.now()
const PASSWORD = `Test-${runId}-!Aa1`
const DATE = '2026-11-04'

const roles = ['attendance_admin', 'marks_admin', 'parent'] as const
type R = (typeof roles)[number]
const ids = {} as Record<R, string>
const tokens = {} as Record<R, string>
const student = {} as Record<'pe' | 'pm' | 'cs' | 'ninth', string>

async function submit(role: R, body: Record<string, unknown>) {
  const res = await fetch(`${APP}/api/mobile/attendance/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens[role]}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: (await res.json()) as { ok?: boolean; error?: string; notifiedCount?: number } }
}
const rec = (key: keyof typeof student, status: 'present' | 'absent' | 'late') => ({ studentId: student[key], studentName: `Subj ${key}`, status })

const rowsFor = async (subject: string) =>
  (await admin.from('attendance_records').select('student_id, status, subject').eq('class_date', DATE).eq('subject', subject).in('student_id', Object.values(student))).data ?? []

beforeAll(async () => {
  for (const r of roles) {
    const email = `subj-att-${r}-${runId}@jeacademy.test`
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('createUser failed')
    ids[r] = data.user.id
    await admin.from('profiles').insert({ id: data.user.id, role: r, email, full_name: `Subj Test ${r}` })
    const c = createClient<Database>(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password: PASSWORD })
    if (e2 || !s.session) throw e2 ?? new Error('sign in failed')
    tokens[r] = s.session.access_token
  }
  const mk = async (key: keyof typeof student, stream: string | null, grade: string, section: string) => {
    const { data, error } = await admin.from('students').insert({
      full_name: `Subj ${key}`, roll_number: `SA-${key}-${runId}`, registration_number: `SAR-${key}-${runId}`,
      program: grade === '11' ? 'HSC-1' : 'SSC-1', grade_level: grade, section, academic_year: 2026, stream,
    }).select('id').single()
    if (error || !data) throw error ?? new Error('student insert failed')
    student[key] = data.id
  }
  await mk('pe', 'Pre-Engineering', '11', 'A')
  await mk('pm', 'Pre-Medical', '11', 'A')
  await mk('cs', 'Computer Science', '11', 'A')
  await mk('ninth', null, '9', 'B1')
  await admin.from('parent_student_links').insert({ parent_id: ids.parent, student_id: student.pm })
}, 60_000)

afterAll(async () => {
  await admin.from('students').delete().in('id', Object.values(student)) // cascades attendance, links, notices
  for (const r of roles) await admin.auth.admin.deleteUser(ids[r])
})

describe('subject-wise attendance (live)', { timeout: 60_000 }, () => {
  it('Physics (common to all faculties) saves one row per student', async () => {
    const res = await submit('attendance_admin', { classDate: DATE, subject: 'Physics', records: [rec('pe', 'present'), rec('pm', 'present'), rec('cs', 'late')] })
    expect(res.status).toBe(200)
    const rows = await rowsFor('Physics')
    expect(rows).toHaveLength(3)
    expect(rows.find((r) => r.student_id === student.cs)?.status).toBe('late')
  })

  it('refuses a student who does not study the subject, and writes nothing', async () => {
    const res = await submit('attendance_admin', { classDate: DATE, subject: 'Mathematics', records: [rec('pe', 'present'), rec('pm', 'present')] })
    expect(res.status).toBe(400)
    expect(res.json.error).toMatch(/does not study Mathematics/)
    expect(await rowsFor('Mathematics')).toHaveLength(0)

    const bio = await submit('attendance_admin', { classDate: DATE, subject: 'Biology', records: [rec('cs', 'present')] })
    expect(bio.status).toBe(400)
    expect(await rowsFor('Biology')).toHaveLength(0)
  })

  it('accepts exactly the students the document lists for Mathematics (Pre-Engineering + Computer Science)', async () => {
    const res = await submit('attendance_admin', { classDate: DATE, subject: 'Mathematics', records: [rec('pe', 'present'), rec('cs', 'present')] })
    expect(res.status).toBe(200)
    expect(await rowsFor('Mathematics')).toHaveLength(2)
  })

  it('re-submitting a subject updates the same rows instead of adding more', async () => {
    const res = await submit('attendance_admin', { classDate: DATE, subject: 'Physics', records: [rec('pe', 'absent'), rec('pm', 'present'), rec('cs', 'present')] })
    expect(res.status).toBe(200)
    const rows = await rowsFor('Physics')
    expect(rows).toHaveLength(3)
    expect(rows.find((r) => r.student_id === student.pe)?.status).toBe('absent')
  })

  it('one student keeps separate rows for different subjects on the same day', async () => {
    await submit('attendance_admin', { classDate: DATE, subject: 'Urdu', records: [rec('pe', 'present')] })
    const { data } = await admin.from('attendance_records').select('subject, status').eq('student_id', student.pe).eq('class_date', DATE)
    const bySubject = Object.fromEntries((data ?? []).map((r) => [r.subject, r.status]))
    expect(bySubject).toMatchObject({ Physics: 'absent', Mathematics: 'present', Urdu: 'present' })
  })

  it('an absence names the subject in the parent\'s notice, one notice per subject', async () => {
    await submit('attendance_admin', { classDate: DATE, subject: 'Physics', records: [rec('pm', 'absent')] })
    await submit('attendance_admin', { classDate: DATE, subject: 'Urdu', records: [rec('pm', 'absent')] })
    const { data } = await admin.from('portal_notifications').select('body').eq('student_id', student.pm).eq('kind', 'absence')
    expect(data).toHaveLength(2)
    const bodies = (data ?? []).map((d) => d.body)
    expect(bodies.some((b) => b.includes('is absent today (4 November 2026) from the Physics class.'))).toBe(true)
    expect(bodies.some((b) => b.includes('from the Urdu class.'))).toBe(true)
  })

  it('a non-First-Year student cannot be marked for a subject', async () => {
    const res = await submit('attendance_admin', { classDate: DATE, subject: 'English', records: [rec('ninth', 'present')] })
    expect(res.status).toBe(400)
    expect(res.json.error).toMatch(/not a First Year student/)
  })

  it('rejects an unknown subject', async () => {
    const res = await submit('attendance_admin', { classDate: DATE, subject: 'Sindhi', records: [rec('pe', 'present')] })
    expect(res.status).toBe(400)
  })

  it('whole-day marking (no subject) still works for other grades, beside subject rows', async () => {
    const res = await submit('attendance_admin', { classDate: DATE, records: [rec('ninth', 'present')] })
    expect(res.status).toBe(200)
    expect(await rowsFor('')).toHaveLength(1)
  })

  it('a marks admin cannot mark attendance', async () => {
    const res = await submit('marks_admin', { classDate: DATE, subject: 'Physics', records: [rec('pe', 'present')] })
    expect(res.status).toBe(403)
  })

  it('the parent sees their own child\'s subject rows, and no one else\'s', async () => {
    const c = createClient<Database>(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${tokens.parent}` } } })
    const { data } = await c.from('attendance_records').select('student_id, subject').in('student_id', Object.values(student))
    expect(new Set((data ?? []).map((r) => r.student_id))).toEqual(new Set([student.pm]))
    expect((data ?? []).map((r) => r.subject).sort()).toEqual(['Physics', 'Urdu'])
  })
})
