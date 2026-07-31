// @vitest-environment node
//
// Phase 5 step 2 (BACKEND-IMPLEMENTATION-PLAN.md), quoting CLAUDE.md §12
// directly: "a parent with two children must never receive a third child's
// data through an off-by-one query, even in a join." This is the single
// most security-sensitive read path in the app — the parent portal has no
// other access control layer, RLS on students/attendance_records/marks IS
// the boundary. Asserts by explicit ID match, not row count.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = Date.now()
const PASSWORD = `Test-${runId}-!Aa1`
const parentAEmail = `phase5-test-parentA-${runId}@jeacademy.test`
const parentBEmail = `phase5-test-parentB-${runId}@jeacademy.test`

let parentAId = ''
let parentBId = ''
let studentA1Id = ''
let studentA2Id = ''
let studentB1Id = ''

async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw error
  return client
}

beforeAll(async () => {
  const { data: parentA, error: parentAError } = await admin.auth.admin.createUser({ email: parentAEmail, password: PASSWORD, email_confirm: true })
  if (parentAError || !parentA.user) throw parentAError ?? new Error('createUser returned no user')
  parentAId = parentA.user.id
  await admin.from('profiles').insert({ id: parentAId, role: 'parent', email: parentAEmail, full_name: 'Phase 5 Test Parent A' })

  const { data: parentB, error: parentBError } = await admin.auth.admin.createUser({ email: parentBEmail, password: PASSWORD, email_confirm: true })
  if (parentBError || !parentB.user) throw parentBError ?? new Error('createUser returned no user')
  parentBId = parentB.user.id
  await admin.from('profiles').insert({ id: parentBId, role: 'parent', email: parentBEmail, full_name: 'Phase 5 Test Parent B' })

  const { data: studentA1, error: sA1Error } = await admin.from('students').insert({
    roll_number: `JE-TEST-P5-A1-${runId}`, full_name: 'Phase5 Child A1', program: 'Matriculation', grade_level: '9', section: 'A',
  }).select('id').single()
  if (sA1Error || !studentA1) throw sA1Error ?? new Error('seed student A1 insert returned no row')
  studentA1Id = studentA1.id

  const { data: studentA2, error: sA2Error } = await admin.from('students').insert({
    roll_number: `JE-TEST-P5-A2-${runId}`, full_name: 'Phase5 Child A2', program: 'Matriculation', grade_level: '9', section: 'B',
  }).select('id').single()
  if (sA2Error || !studentA2) throw sA2Error ?? new Error('seed student A2 insert returned no row')
  studentA2Id = studentA2.id

  const { data: studentB1, error: sB1Error } = await admin.from('students').insert({
    roll_number: `JE-TEST-P5-B1-${runId}`, full_name: 'Phase5 Child B1', program: 'Matriculation', grade_level: '9', section: 'C',
  }).select('id').single()
  if (sB1Error || !studentB1) throw sB1Error ?? new Error('seed student B1 insert returned no row')
  studentB1Id = studentB1.id

  await admin.from('parent_student_links').insert([
    { parent_id: parentAId, student_id: studentA1Id },
    { parent_id: parentAId, student_id: studentA2Id },
    { parent_id: parentBId, student_id: studentB1Id },
  ])

  await admin.from('attendance_records').insert([
    { student_id: studentA1Id, class_date: '2026-02-01', status: 'present' },
    { student_id: studentB1Id, class_date: '2026-02-01', status: 'present' },
  ])
  await admin.from('marks').insert([
    { student_id: studentA1Id, subject: 'Mathematics', exam_type: 'monthly', score: 80, max_score: 100, term: '2026-p5-test' },
    { student_id: studentB1Id, subject: 'Mathematics', exam_type: 'monthly', score: 80, max_score: 100, term: '2026-p5-test' },
  ])
}, 30_000)

afterAll(async () => {
  await admin.from('marks').delete().in('student_id', [studentA1Id, studentA2Id, studentB1Id])
  await admin.from('attendance_records').delete().in('student_id', [studentA1Id, studentA2Id, studentB1Id])
  await admin.from('students').delete().in('id', [studentA1Id, studentA2Id, studentB1Id])
  if (parentAId) await admin.auth.admin.deleteUser(parentAId)
  if (parentBId) await admin.auth.admin.deleteUser(parentBId)
}, 30_000)

describe('parent portal scoping (live Supabase project) — CLAUDE.md §12 off-by-one regression', () => {
  it("parent A's linked-children query returns exactly {A1, A2} — never B1", async () => {
    const client = await signInAs(parentAEmail)
    const { data, error } = await client
      .from('parent_student_links')
      .select('students(id)')
      .eq('parent_id', parentAId)

    expect(error).toBeNull()
    const returnedIds = (data ?? []).map((row) => row.students?.id).filter(Boolean).sort()
    expect(returnedIds).toEqual([studentA1Id, studentA2Id].sort())
    expect(returnedIds).not.toContain(studentB1Id)
  })

  it("parent A cannot read parent B's child's row directly by ID, even knowing it", async () => {
    const client = await signInAs(parentAEmail)
    const { data, error } = await client.from('students').select('id').eq('id', studentB1Id).maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it("parent A cannot read parent B's child's attendance records", async () => {
    const client = await signInAs(parentAEmail)
    const { data, error } = await client.from('attendance_records').select('id').eq('student_id', studentB1Id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it("parent A cannot read parent B's child's marks", async () => {
    const client = await signInAs(parentAEmail)
    const { data, error } = await client.from('marks').select('id').eq('student_id', studentB1Id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('parent A CAN read both of their own linked children\'s attendance and marks', async () => {
    const client = await signInAs(parentAEmail)

    const { data: att, error: attError } = await client.from('attendance_records').select('student_id').eq('student_id', studentA1Id)
    expect(attError).toBeNull()
    expect(att?.length).toBe(1)

    const { data: marks, error: marksError } = await client.from('marks').select('student_id').eq('student_id', studentA1Id)
    expect(marksError).toBeNull()
    expect(marks?.length).toBe(1)
  })
})
