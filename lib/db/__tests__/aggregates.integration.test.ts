// @vitest-environment node
//
// Hits the real linked Supabase project. Proves the SQL aggregates that replaced
// "download the whole table and add it up in JavaScript" give the right numbers,
// that row-level security still decides what each role may count, and that the
// one-call bulk marks save inserts / updates / logs history correctly.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient<Database>(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })

const run = Date.now()
const PASSWORD = `Agg-${run}-!Aa1`
const GRADE = `TG${run % 100000}`
const SECTION = 'TS'
const SUBJECT = `TSUBJ-${run}`
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)

const userIds: string[] = []
const studentIds: string[] = []
let marksAdmin: SupabaseClient<Database>
let attendanceAdmin: SupabaseClient<Database>
let parent: SupabaseClient<Database>
let marksAdminId = ''

async function makeUser(role: Database['public']['Enums']['user_role']): Promise<{ id: string; client: SupabaseClient<Database> }> {
  const email = `agg-${role}-${run}@jeacademy.test`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  userIds.push(data.user.id)
  await admin.from('profiles').insert({ id: data.user.id, role, email, full_name: `Agg ${role}` })
  const client = createClient<Database>(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (signInError) throw signInError
  return { id: data.user.id, client }
}

beforeAll(async () => {
  const m = await makeUser('marks_admin')
  marksAdmin = m.client
  marksAdminId = m.id
  attendanceAdmin = (await makeUser('attendance_admin')).client
  parent = (await makeUser('parent')).client

  for (let k = 1; k <= 3; k++) {
    const { data, error } = await admin.from('students').insert({
      roll_number: `AGG-${k}-${run}`, registration_number: `REG-AGG-${k}-${run}`, academic_year: 2026,
      full_name: `Aggregate Tester ${k}`, program: 'Matriculation', grade_level: GRADE, section: SECTION,
    }).select('id').single()
    if (error || !data) throw error ?? new Error('student insert failed')
    studentIds.push(data.id)
  }
  // marks: student1 40/50 + 30/50 (avg 70), student2 90/100 (avg 90); student3 none
  await admin.from('marks').insert([
    { student_id: studentIds[0], subject: SUBJECT, exam_type: 'monthly', score: 40, max_score: 50, term: '2026', exam_date: '2026-09-01' },
    { student_id: studentIds[0], subject: SUBJECT, exam_type: 'monthly', score: 30, max_score: 50, term: '2026', exam_date: '2026-09-02' },
    { student_id: studentIds[1], subject: SUBJECT, exam_type: 'monthly', score: 90, max_score: 100, term: '2026', exam_date: '2026-09-01' },
  ])
})

afterAll(async () => {
  await admin.from('students').delete().in('id', studentIds) // cascades marks, attendance, history
  for (const id of userIds) {
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
  }
})

describe('marks aggregates (database) match a hand calculation', () => {
  it('marks_student_averages: per-student average % and count', async () => {
    const { data, error } = await marksAdmin.rpc('marks_student_averages')
    expect(error).toBeNull()
    const mine = new Map((data ?? []).filter((r) => studentIds.includes(r.student_id)).map((r) => [r.student_id, r]))
    expect(Number(mine.get(studentIds[0])?.avg_pct)).toBeCloseTo(70, 5)
    expect(Number(mine.get(studentIds[0])?.entry_count)).toBe(2)
    expect(Number(mine.get(studentIds[1])?.avg_pct)).toBeCloseTo(90, 5)
    expect(mine.has(studentIds[2])).toBe(false) // never graded
  })

  it('marks_class_stats: entries, graded students and average for a class', async () => {
    const { data } = await marksAdmin.rpc('marks_class_stats')
    const row = (data ?? []).find((r) => r.grade_level === GRADE && r.section === SECTION)
    expect(Number(row?.entries)).toBe(3)
    expect(Number(row?.graded)).toBe(2)
    expect(Number(row?.avg_pct)).toBeCloseTo((80 + 60 + 90) / 3, 5)
  })

  it('marks_subject_stats: entries and average per subject', async () => {
    const { data } = await marksAdmin.rpc('marks_subject_stats')
    const row = (data ?? []).find((r) => r.subject === SUBJECT)
    expect(Number(row?.entries)).toBe(3)
    expect(Number(row?.avg_pct)).toBeCloseTo((80 + 60 + 90) / 3, 5)
  })

  it('marks_existing: returns just the saved marks for one class/subject/exam/date', async () => {
    const { data } = await marksAdmin.rpc('marks_existing', { p_grade: GRADE, p_section: SECTION, p_subject: SUBJECT, p_exam_type: 'monthly', p_date: '2026-09-01' })
    expect(new Map((data ?? []).map((r) => [r.student_id, r.score]))).toEqual(new Map([[studentIds[0], 40], [studentIds[1], 90]]))
  })

  it('row-level security still decides what is counted', async () => {
    // a parent with no linked children, and an attendance admin, see none of it
    for (const client of [parent, attendanceAdmin]) {
      const { data } = await client.rpc('marks_student_averages')
      expect((data ?? []).filter((r) => studentIds.includes(r.student_id))).toHaveLength(0)
    }
  })

  it('anonymous callers cannot run the aggregates at all', async () => {
    const anon = createClient<Database>(URL, ANON, { auth: { persistSession: false } })
    const { error } = await anon.rpc('marks_student_averages')
    expect(error).not.toBeNull()
  })
})

describe('attendance aggregates (database)', () => {
  const today = iso(0)
  const eightAgo = iso(-8)

  it('class/student/day/week/grade figures add up', async () => {
    const before = await attendanceAdmin.rpc('attendance_day_stats', { p_dates: [today, eightAgo] })
    const beforeToday = Number(before.data?.find((r) => r.class_date === today)?.present ?? 0)

    await admin.from('attendance_records').insert([
      { student_id: studentIds[0], class_date: today, status: 'present' },
      { student_id: studentIds[1], class_date: today, status: 'late' },
      { student_id: studentIds[2], class_date: today, status: 'absent' },
      { student_id: studentIds[0], class_date: eightAgo, status: 'present' },
    ])

    const stats = await attendanceAdmin.rpc('attendance_student_stats')
    const mine = new Map((stats.data ?? []).filter((r) => studentIds.includes(r.student_id)).map((r) => [r.student_id, r]))
    expect([Number(mine.get(studentIds[0])?.present), Number(mine.get(studentIds[0])?.total)]).toEqual([2, 2])
    expect([Number(mine.get(studentIds[1])?.present), Number(mine.get(studentIds[1])?.total)]).toEqual([1, 1]) // late counts as attended
    expect([Number(mine.get(studentIds[2])?.present), Number(mine.get(studentIds[2])?.total)]).toEqual([0, 1])

    const term = await attendanceAdmin.rpc('attendance_class_term', { p_grade: GRADE, p_section: SECTION })
    const t = new Map((term.data ?? []).map((r) => [r.student_id, r]))
    expect([Number(t.get(studentIds[0])?.present), Number(t.get(studentIds[0])?.absent), Number(t.get(studentIds[0])?.late), Number(t.get(studentIds[0])?.total)]).toEqual([2, 0, 0, 2])
    expect(Number(t.get(studentIds[2])?.absent)).toBe(1)

    const day = await attendanceAdmin.rpc('attendance_class_day', { p_date: today })
    const mineDay = (day.data ?? []).filter((r) => r.grade_level === GRADE && r.section === SECTION)
    expect(Object.fromEntries(mineDay.map((r) => [r.status, Number(r.n)]))).toEqual({ present: 1, late: 1, absent: 1 })

    const after = await attendanceAdmin.rpc('attendance_day_stats', { p_dates: [today, eightAgo] })
    const afterToday = after.data?.find((r) => r.class_date === today)
    expect(Number(afterToday?.present) - beforeToday).toBe(1)

    const weekly = await attendanceAdmin.rpc('attendance_weekly_rates', { p_today: today })
    expect(weekly.data).toHaveLength(4)
    expect((weekly.data ?? []).map((b) => b.bucket)).toEqual([0, 1, 2, 3])

    const grades = await attendanceAdmin.rpc('attendance_grade_rates')
    const g = (grades.data ?? []).find((r) => r.grade_level === GRADE)
    expect([Number(g?.attended), Number(g?.total)]).toEqual([3, 4])
  })

  it('a marks admin cannot count attendance (row-level security)', async () => {
    const { data } = await marksAdmin.rpc('attendance_student_stats')
    expect((data ?? []).filter((r) => studentIds.includes(r.student_id))).toHaveLength(0)
  })
})

describe('bulk_upsert_marks (one-call batch save)', () => {
  const rows = (scores: [number, number, number], max = 50) => studentIds.map((id, i) => ({
    student_id: id, subject: `${SUBJECT}-BULK`, exam_type: 'monthly', term: '2026', exam_date: '2026-09-20', score: scores[i], max_score: max,
  }))

  it('inserts new marks, stamping who recorded them', async () => {
    const { data, error } = await marksAdmin.rpc('bulk_upsert_marks', { p_rows: rows([10, 20, 30]) })
    expect(error).toBeNull()
    expect(data?.[0]).toMatchObject({ inserted: 3, updated: 0 })
    expect(data?.[0].changed).toHaveLength(3)
    const { data: saved } = await admin.from('marks').select('score, term, exam_date, recorded_by').eq('subject', `${SUBJECT}-BULK`)
    expect(saved).toHaveLength(3)
    expect(saved?.every((m) => m.term === '2026' && m.exam_date === '2026-09-20' && m.recorded_by === marksAdminId)).toBe(true)
  })

  it('re-sending identical marks changes nothing and logs no history', async () => {
    const { data } = await marksAdmin.rpc('bulk_upsert_marks', { p_rows: rows([10, 20, 30]) })
    expect(data?.[0]).toMatchObject({ inserted: 0, updated: 0, changed: [] })
    const { count } = await admin.from('marks_edit_history').select('id', { count: 'exact', head: true }).eq('edited_by', marksAdminId)
    expect(count).toBe(0)
  })

  it('a changed score is updated and its edit is recorded (never a silent overwrite)', async () => {
    const { data } = await marksAdmin.rpc('bulk_upsert_marks', { p_rows: rows([10, 25, 30]) })
    expect(data?.[0]).toMatchObject({ inserted: 0, updated: 1 })
    expect(data?.[0].changed).toEqual([expect.objectContaining({ student_id: studentIds[1], score: 25 })])
    const { data: hist } = await admin.from('marks_edit_history').select('previous_score, new_score').eq('edited_by', marksAdminId)
    expect(hist).toEqual([{ previous_score: 20, new_score: 25 }])
  })

  it('a changed total alone updates the mark but is not a score edit', async () => {
    const { data } = await marksAdmin.rpc('bulk_upsert_marks', { p_rows: rows([10, 25, 30], 60) })
    expect(data?.[0]).toMatchObject({ inserted: 0, updated: 3, changed: [] })
    const { count } = await admin.from('marks_edit_history').select('id', { count: 'exact', head: true }).eq('edited_by', marksAdminId)
    expect(count).toBe(1) // still just the one real score edit
  })

  it('other roles and anonymous callers cannot write marks through it', async () => {
    for (const client of [attendanceAdmin, parent]) {
      const { data, error } = await client.rpc('bulk_upsert_marks', { p_rows: rows([1, 2, 3]).map((r) => ({ ...r, subject: `${SUBJECT}-DENIED` })) })
      expect(error !== null || data?.[0]?.inserted === 0).toBe(true)
    }
    const { count } = await admin.from('marks').select('id', { count: 'exact', head: true }).eq('subject', `${SUBJECT}-DENIED`)
    expect(count).toBe(0)
    const anon = createClient<Database>(URL, ANON, { auth: { persistSession: false } })
    expect((await anon.rpc('bulk_upsert_marks', { p_rows: [] })).error).not.toBeNull()
  })

  it('a 1,200-mark batch saves in a single call (well past the 1,000-row response limit)', async () => {
    const many = Array.from({ length: 1200 }, (_, i) => ({
      student_id: studentIds[i % 3], subject: `${SUBJECT}-MANY`, exam_type: 'monthly', term: '2026',
      exam_date: new Date(Date.UTC(2025, 0, 1 + Math.floor(i / 3))).toISOString().slice(0, 10), score: 10, max_score: 20,
    }))
    const { data, error } = await marksAdmin.rpc('bulk_upsert_marks', { p_rows: many })
    expect(error).toBeNull()
    expect(data?.[0].inserted).toBe(1200)
  }, 60000)
})
