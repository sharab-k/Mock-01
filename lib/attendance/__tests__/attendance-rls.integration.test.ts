// @vitest-environment node
//
// Phase 3 step 5 (BACKEND-IMPLEMENTATION-PLAN.md): prove attendance_records'
// RLS policies are enforced at the database level. attendance_admin/super_admin
// get "attendance_full_access" (everything); marks_admin and admissions_admin
// get nothing; a parent gets SELECT scoped to their own linked children only
// (parent_read_linked_children_attendance) — CLAUDE.md §12 explicitly calls out
// the off-by-one case: a parent must never see a different parent's child.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type StaffUser = { id: string; email: string; role: Database['public']['Enums']['user_role'] }

const runId = Date.now()
const PASSWORD = `Test-${runId}-!Aa1`

const staffUsers: StaffUser[] = [
  { id: '', email: `phase3-test-attendance-${runId}@jeacademy.test`, role: 'attendance_admin' },
  { id: '', email: `phase3-test-marks-${runId}@jeacademy.test`, role: 'marks_admin' },
  { id: '', email: `phase3-test-admissions-${runId}@jeacademy.test`, role: 'admissions_admin' },
]

let parentAId = ''
let parentBId = ''
let studentAId = ''
let studentBId = ''
const parentAEmail = `phase3-test-parentA-${runId}@jeacademy.test`
const parentBEmail = `phase3-test-parentB-${runId}@jeacademy.test`

async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw error
  return client
}

beforeAll(async () => {
  for (const u of staffUsers) {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: PASSWORD, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('createUser returned no user')
    u.id = data.user.id
    const { error: profileError } = await admin.from('profiles').insert({ id: u.id, role: u.role, email: u.email, full_name: `Phase 3 Test (${u.role})` })
    if (profileError) throw profileError
  }

  const { data: parentA, error: parentAError } = await admin.auth.admin.createUser({ email: parentAEmail, password: PASSWORD, email_confirm: true })
  if (parentAError || !parentA.user) throw parentAError ?? new Error('createUser returned no user')
  parentAId = parentA.user.id
  await admin.from('profiles').insert({ id: parentAId, role: 'parent', email: parentAEmail, full_name: 'Phase 3 Test Parent A' })

  const { data: parentB, error: parentBError } = await admin.auth.admin.createUser({ email: parentBEmail, password: PASSWORD, email_confirm: true })
  if (parentBError || !parentB.user) throw parentBError ?? new Error('createUser returned no user')
  parentBId = parentB.user.id
  await admin.from('profiles').insert({ id: parentBId, role: 'parent', email: parentBEmail, full_name: 'Phase 3 Test Parent B' })

  const { data: studentA, error: studentAError } = await admin.from('students').insert({
    roll_number: `JE-TEST-ATT-A-${runId}`, full_name: 'Attendance Test Student A', program: 'Matriculation', grade_level: '9', section: 'A',
  }).select('id').single()
  if (studentAError || !studentA) throw studentAError ?? new Error('seed student A insert returned no row')
  studentAId = studentA.id
  await admin.from('parent_student_links').insert({ parent_id: parentAId, student_id: studentAId })

  const { data: studentB, error: studentBError } = await admin.from('students').insert({
    roll_number: `JE-TEST-ATT-B-${runId}`, full_name: 'Attendance Test Student B', program: 'Matriculation', grade_level: '9', section: 'B',
  }).select('id').single()
  if (studentBError || !studentB) throw studentBError ?? new Error('seed student B insert returned no row')
  studentBId = studentB.id
  await admin.from('parent_student_links').insert({ parent_id: parentBId, student_id: studentBId })
}, 30_000)

afterAll(async () => {
  await admin.from('attendance_records').delete().in('student_id', [studentAId, studentBId])
  await admin.from('students').delete().in('id', [studentAId, studentBId])
  for (const id of [parentAId, parentBId]) if (id) await admin.auth.admin.deleteUser(id)
  for (const u of staffUsers) if (u.id) await admin.auth.admin.deleteUser(u.id)
}, 30_000)

describe('attendance_records RLS enforcement (live Supabase project)', () => {
  it('attendance_admin can insert an attendance record', async () => {
    const client = await signInAs(staffUsers[0].email)
    const { data, error } = await client.from('attendance_records')
      .insert({ student_id: studentAId, class_date: '2026-01-01', status: 'present' })
      .select('id').single()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })

  it('marks_admin cannot insert an attendance record', async () => {
    const client = await signInAs(staffUsers[1].email)
    const { error } = await client.from('attendance_records')
      .insert({ student_id: studentBId, class_date: '2026-01-02', status: 'present' })

    expect(error).not.toBeNull()
  })

  it('admissions_admin cannot insert an attendance record', async () => {
    const client = await signInAs(staffUsers[2].email)
    const { error } = await client.from('attendance_records')
      .insert({ student_id: studentBId, class_date: '2026-01-03', status: 'present' })

    expect(error).not.toBeNull()
  })

  it("a parent can read their own linked child's attendance record", async () => {
    const client = await signInAs(parentAEmail)
    const { data, error } = await client.from('attendance_records')
      .select('id').eq('student_id', studentAId).eq('class_date', '2026-01-01').maybeSingle()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })

  it("a parent cannot read a different parent's child's attendance record (off-by-one)", async () => {
    // Seed a record for student B via the service-role client, then confirm
    // parent A — who is linked only to student A — gets nothing back for it.
    await admin.from('attendance_records').insert({ student_id: studentBId, class_date: '2026-01-04', status: 'absent' })

    const client = await signInAs(parentAEmail)
    const { data, error } = await client.from('attendance_records')
      .select('id').eq('student_id', studentBId).eq('class_date', '2026-01-04').maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })
})
