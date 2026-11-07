// @vitest-environment node
//
// Live: First and Second Year subject-wise attendance against the dev server + real Supabase
// project, called with real role JWTs (Bearer) on the same route the phone app
// uses. One student can have a row per subject per day; only students who study
// the subject can be marked for it; an absence names the subject in the parent's
// notice; whole-day records for other grades are untouched.
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { refuseInactiveStudents } from '@/lib/students/inactive-guard'
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
const student = {} as Record<'pe' | 'pm' | 'cs' | 'ninth' | 'y2pe' | 'y2pm', string>

async function submit(role: R, body: Record<string, unknown>) {
  const res = await fetch(`${APP}/api/mobile/attendance/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens[role]}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: (await res.json()) as { ok?: boolean; error?: string; notifiedCount?: number } }
}
const rec = (key: keyof typeof student, status: 'present' | 'absent' | 'late' | 'leave') => ({ studentId: student[key], studentName: `Subj ${key}`, status })

const rowsFor = async (subject: string) =>
  (await admin.from('attendance_records').select('student_id, status, subject').eq('class_date', DATE).eq('subject', subject).in('student_id', Object.values(student))).data ?? []


const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const getXlsx = (path: string, role?: R) => fetch(`${APP}${path}`, { headers: role ? { Authorization: `Bearer ${tokens[role]}` } : {} })
async function firstSheet(res: Response) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as unknown as ArrayBuffer)
  return wb.worksheets[0]!
}

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
      full_name: `Subj ${key}`, gr_number: `GR-SA-${key}-${runId}`, roll_number: `SA-${key}-${runId}`, registration_number: `SAR-${key}-${runId}`,
      program: grade === '11' ? 'HSC-1' : grade === '12' ? 'HSC-2' : 'SSC-1', grade_level: grade, section, academic_year: 2026, stream,
    }).select('id').single()
    if (error || !data) throw error ?? new Error('student insert failed')
    student[key] = data.id
  }
  await mk('pe', 'Pre-Engineering', '11', 'A')
  await mk('pm', 'Pre-Medical', '11', 'A')
  await mk('cs', 'Computer Science', '11', 'A')
  await mk('ninth', null, '9', 'B1')
  await mk('y2pe', 'Pre-Engineering', '12', 'A')
  await mk('y2pm', 'Pre-Medical', '12', 'A')
  await admin.from('parent_student_links').insert([{ parent_id: ids.parent, student_id: student.pm }, { parent_id: ids.parent, student_id: student.y2pm }])
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
    expect(res.json.error).toMatch(/not a First Year or Second Year student/)
  })

  it('Second Year: Pak. Studies is saved for every faculty, and the parent notice names it', async () => {
    const ok = await submit('attendance_admin', { classDate: DATE, subject: 'Pak. Studies', records: [rec('y2pe', 'present'), rec('y2pm', 'absent')] })
    expect(ok.status).toBe(200)
    expect(await rowsFor('Pak. Studies')).toHaveLength(2)
    const { data } = await admin.from('portal_notifications').select('body').eq('student_id', student.y2pm).eq('kind', 'absence')
    expect((data ?? []).some((d) => d.body.includes('from the Pak. Studies class.'))).toBe(true)
  })

  it('Second Year follows its own faculty subjects', async () => {
    const bio = await submit('attendance_admin', { classDate: DATE, subject: 'Biology', records: [rec('y2pe', 'present')] })
    expect(bio.status).toBe(400)
    expect(bio.json.error).toMatch(/does not study Biology/)
    const chem = await submit('attendance_admin', { classDate: DATE, subject: 'Chemistry', records: [rec('y2pe', 'present'), rec('y2pm', 'present')] })
    expect(chem.status).toBe(200)
  })

  it('Islamiat is First Year only and Pak. Studies is Second Year only', async () => {
    const isl = await submit('attendance_admin', { classDate: DATE, subject: 'Islamiat', records: [rec('y2pe', 'present')] })
    expect(isl.status).toBe(400)
    expect(isl.json.error).toMatch(/does not study Islamiat/)
    const pak = await submit('attendance_admin', { classDate: DATE, subject: 'Pak. Studies', records: [rec('pe', 'present')] })
    expect(pak.status).toBe(400)
    expect(pak.json.error).toMatch(/does not study Pak. Studies/)
    expect((await submit('attendance_admin', { classDate: DATE, subject: 'Islamiat', records: [rec('pe', 'present')] })).status).toBe(200)
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

  it('First and Second Year can also be marked whole-day, one by one, beside their subject rows', async () => {
    const res = await submit('attendance_admin', { classDate: DATE, records: [rec('pe', 'late'), rec('y2pm', 'present')] })
    expect(res.status).toBe(200)
    const whole = await rowsFor('')
    expect(whole.filter((r) => r.student_id === student.pe)[0]?.status).toBe('late')
    expect(whole.filter((r) => r.student_id === student.y2pm)[0]?.status).toBe('present')
    // the subject rows of the same student on the same day are untouched
    const { data } = await admin.from('attendance_records').select('subject, status').eq('student_id', student.pe).eq('class_date', DATE)
    const bySubject = Object.fromEntries((data ?? []).map((r) => [r.subject, r.status]))
    expect(bySubject).toMatchObject({ '': 'late', Physics: 'absent', Mathematics: 'present' })
  })

  it('Leave is recorded without an absence alert and is left out of the attendance totals', async () => {
    const before = ((await admin.from('portal_notifications').select('id', { count: 'exact', head: true }).eq('student_id', student.pm).eq('kind', 'absence')).count) ?? 0
    const res = await submit('attendance_admin', { classDate: DATE, records: [rec('pm', 'leave')] })
    expect(res.status).toBe(200)
    expect(res.json.notifiedCount ?? 0).toBe(0)
    expect(((await admin.from('portal_notifications').select('id', { count: 'exact', head: true }).eq('student_id', student.pm).eq('kind', 'absence')).count) ?? 0).toBe(before)
    expect((await rowsFor('')).find((r) => r.student_id === student.pm)?.status).toBe('leave')

    const all = (await admin.from('attendance_records').select('status').eq('student_id', student.pm)).data ?? []
    expect(all.some((r) => r.status === 'leave')).toBe(true)
    const stats = (await admin.rpc('attendance_student_stats')).data?.find((r) => r.student_id === student.pm)
    expect(Number(stats?.total)).toBe(all.filter((r) => r.status !== 'leave').length) // leave is not a day that could have been attended
    const term = (await admin.rpc('attendance_class_term', { p_grade: '11', p_section: 'A' })).data?.find((r) => r.student_id === student.pm)
    expect(Number(term?.total)).toBe(all.filter((r) => r.status !== 'leave').length)
  })

  it('Leave can be changed back to present', async () => {
    expect((await submit('attendance_admin', { classDate: DATE, records: [rec('pm', 'present')] })).status).toBe(200)
    expect((await rowsFor('')).find((r) => r.student_id === student.pm)?.status).toBe('present')
    await admin.from('attendance_records').delete().eq('student_id', student.pm).eq('subject', '') // leave the shared fixtures as the later tests expect
  })

  it('the class roster carries each student GR number, for the serial / GR / name layout', async () => {
    const res = await fetch(`${APP}/api/mobile/attendance/class-roster?grade=9&section=B1&date=${DATE}`, { headers: { Authorization: `Bearer ${tokens.attendance_admin}` } })
    expect(res.status).toBe(200)
    const { roster } = (await res.json()) as { roster: { id: string; name: string; gr: string | null; status: string }[] }
    const row = roster.find((r) => r.id === student.ninth)
    expect(row?.gr).toBe(`GR-SA-ninth-${runId}`)
  })

  it('class Excel export lists roll no, name, GR number, contact and status for one section', async () => {
    const res = await getXlsx('/api/students/export?grade=9&section=B1', 'attendance_admin')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe(XLSX)
    expect(res.headers.get('content-disposition')).toContain('students-9-B1.xlsx')
    const ws = await firstSheet(res)
    expect((ws.getRow(1).values as unknown[]).slice(1)).toEqual(['Sr', 'Roll No', 'Name', 'GR Number', 'Contact', 'Status'])
    const row = ws.getRows(2, ws.rowCount - 1)!.find((r) => r.getCell(3).value === 'Subj ninth')!
    expect(row.getCell(4).value).toBe(`GR-SA-ninth-${runId}`)
    expect(row.getCell(6).value).toBe('Active')
  })

  it('the class export includes students who have left as Inactive, unless active=1 is asked for', async () => {
    const { data: gone } = await admin.from('students').insert({
      full_name: 'Subj gone', roll_number: `SA-gone-${runId}`, registration_number: `SAR-gone-${runId}`, gr_number: `GR-SA-gone-${runId}`,
      program: 'SSC-1', grade_level: '9', section: 'B1', academic_year: 2026, status: 'inactive',
    }).select('id').single()
    try {
      const all = await firstSheet(await getXlsx('/api/students/export?grade=9&section=B1', 'marks_admin'))
      const goneRow = all.getRows(2, all.rowCount - 1)!.find((r) => r.getCell(3).value === 'Subj gone')
      expect(goneRow?.getCell(6).value).toBe('Inactive')
      const activeOnly = await firstSheet(await getXlsx('/api/students/export?grade=9&section=B1&active=1', 'marks_admin'))
      expect(activeOnly.getRows(2, activeOnly.rowCount - 1)!.some((r) => r.getCell(3).value === 'Subj gone')).toBe(false)
    } finally {
      await admin.from('students').delete().eq('id', gone!.id)
    }
  })

  it('the class export is for staff only, and rejects a class that does not exist', async () => {
    expect((await getXlsx('/api/students/export?grade=9&section=B1', 'parent')).status).toBe(403)
    expect((await getXlsx('/api/students/export?grade=9&section=B1')).status).toBe(401)
    expect((await getXlsx('/api/students/export?grade=99&section=B1', 'attendance_admin')).status).toBe(400)
    expect((await getXlsx('/api/students/export?grade=11&section=G1', 'attendance_admin')).status).toBe(400) // G1 is not a section of a co-ed class
  })

  it('the monthly attendance sheet has one column per day, the saved marks, and totals', async () => {
    const res = await getXlsx('/api/attendance/monthly-report?grade=9&section=B1&month=2026-11', 'attendance_admin')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe(XLSX)
    expect(res.headers.get('content-disposition')).toContain('attendance-9-B1-2026-11.xlsx')
    const ws = await firstSheet(res)
    const header = (ws.getRow(1).values as unknown[]).slice(1)
    expect(header.slice(0, 3)).toEqual(['Sr', 'GR No', 'Name'])
    expect(header[3]).toBe('1\nS') // 1 Nov 2026 is a Sunday
    expect(header).toHaveLength(3 + 30 + 5) // 30 days in November, then Present / Late / Absent / Leave / %
    const row = ws.getRows(2, ws.rowCount - 1)!.find((r) => r.getCell(3).value === 'Subj ninth')!
    expect(row.getCell(3 + 4).value).toBe('P') // the whole-day mark on 4 Nov
    expect(row.getCell(3 + 30 + 1).value).toBe(1) // Present total
    expect(row.getCell(3 + 30 + 3).value).toBe(0) // Absent total
  })

  it('an older month with no marks still returns the class, with empty days', async () => {
    const ws = await firstSheet(await getXlsx('/api/attendance/monthly-report?grade=9&section=B1&month=2026-10', 'attendance_admin'))
    const row = ws.getRows(2, ws.rowCount - 1)!.find((r) => r.getCell(3).value === 'Subj ninth')!
    expect(row.getCell(4).value).toBe('')
    expect(row.getCell(3 + 31 + 5).value).toBe('') // no percentage yet
  })

  it('the monthly sheet is for attendance staff only, and needs a real month', async () => {
    expect((await getXlsx('/api/attendance/monthly-report?grade=9&section=B1&month=2026-11', 'marks_admin')).status).toBe(403)
    expect((await getXlsx('/api/attendance/monthly-report?grade=9&section=B1&month=2026-11', 'parent')).status).toBe(403)
    expect((await getXlsx('/api/attendance/monthly-report?grade=9&section=B1&month=2026-11')).status).toBe(401)
    expect((await getXlsx('/api/attendance/monthly-report?grade=9&section=B1&month=2026-13', 'attendance_admin')).status).toBe(400)
    expect((await getXlsx('/api/attendance/monthly-report?grade=9&section=B1&month=nope', 'attendance_admin')).status).toBe(400)
  })

  it('an inactive student cannot be marked, even by a hand-built request; setting them Active again brings them back with their history', async () => {
    const { data: gone } = await admin.from('students').insert({
      full_name: 'Subj inactive', roll_number: `SA-inactive-${runId}`, registration_number: `SAR-inactive-${runId}`, gr_number: `GR-SA-inactive-${runId}`,
      program: 'SSC-1', grade_level: '9', section: 'B1', academic_year: 2026,
    }).select('id').single()
    const id = gone!.id
    const day = '2026-10-20'
    try {
      // history from when the student was still active
      expect((await submit('attendance_admin', { classDate: day, records: [{ studentId: id, studentName: 'Subj inactive', status: 'present' }] })).status).toBe(200)
      await admin.from('students').update({ status: 'inactive' }).eq('id', id)

      const refused = await submit('attendance_admin', { classDate: '2026-10-21', records: [{ studentId: id, studentName: 'Subj inactive', status: 'present' }] })
      expect(refused.status).not.toBe(200)
      expect(refused.json.error).toMatch(/inactive/)
      expect((await admin.from('attendance_records').select('id').eq('student_id', id).eq('class_date', '2026-10-21')).data ?? []).toHaveLength(0)

      // the old record is still there
      expect((await admin.from('attendance_records').select('status').eq('student_id', id).eq('class_date', day)).data?.[0]?.status).toBe('present')

      // and the roster the teachers see no longer lists them
      const roster = await fetch(`${APP}/api/mobile/attendance/class-roster?grade=9&section=B1&date=2026-10-21`, { headers: { Authorization: `Bearer ${tokens.attendance_admin}` } })
      expect(((await roster.json()) as { roster: { id: string }[] }).roster.some((r) => r.id === id)).toBe(false)

      await admin.from('students').update({ status: 'active' }).eq('id', id)
      expect((await submit('attendance_admin', { classDate: '2026-10-21', records: [{ studentId: id, studentName: 'Subj inactive', status: 'absent' }] })).status).toBe(200)
      expect((await admin.from('attendance_records').select('class_date').eq('student_id', id)).data).toHaveLength(2)
    } finally {
      await admin.from('students').delete().eq('id', id)
    }
  })

  it('the inactive guard names who is inactive and lets active students through', async () => {
    const { data: gone } = await admin.from('students').insert({
      full_name: 'Subj guard', roll_number: `SA-guard-${runId}`, registration_number: `SAR-guard-${runId}`,
      program: 'SSC-1', grade_level: '9', section: 'B1', academic_year: 2026, status: 'inactive',
    }).select('id').single()
    try {
      expect(await refuseInactiveStudents(admin, [student.ninth])).toBeNull()
      expect(await refuseInactiveStudents(admin, [])).toBeNull()
      expect(await refuseInactiveStudents(admin, [student.ninth, gone!.id])).toMatch(/Subj guard is inactive/)
    } finally {
      await admin.from('students').delete().eq('id', gone!.id)
    }
  })

  it('a marks admin cannot mark attendance', async () => {
    const res = await submit('marks_admin', { classDate: DATE, subject: 'Physics', records: [rec('pe', 'present')] })
    expect(res.status).toBe(403)
  })

  it('the parent sees their own child\'s subject rows, and no one else\'s', async () => {
    const c = createClient<Database>(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${tokens.parent}` } } })
    const { data } = await c.from('attendance_records').select('student_id, subject').in('student_id', Object.values(student))
    // Linked to one First Year and one Second Year child; never the other three students.
    expect(new Set((data ?? []).map((r) => r.student_id))).toEqual(new Set([student.pm, student.y2pm]))
    expect((data ?? []).filter((r) => r.student_id === student.pm).map((r) => r.subject).sort()).toEqual(['Physics', 'Urdu'])
  })
})
