// @vitest-environment node
//
// Phase 2 step 5 (BACKEND-IMPLEMENTATION-PLAN.md): prove the `students` table's
// RLS policies are enforced at the database level, not just assumed from the
// migration SQL. attendance_admin and marks_admin get "staff_read_access"
// (SELECT only); admissions_admin/super_admin get "admissions_full_access"
// (everything).
//
// TODO(Phase 3/4): once attendance_records/marks exist, add the forward-looking
// assertion that admissions_admin cannot read them — those tables don't exist
// yet, so that check can't be written today.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type TestUser = { id: string; email: string; role: Database['public']['Enums']['user_role'] }

const runId = Date.now()
const testUsers: TestUser[] = [
  { id: '', email: `phase2-test-admissions-${runId}@jeacademy.test`, role: 'admissions_admin' },
  { id: '', email: `phase2-test-attendance-${runId}@jeacademy.test`, role: 'attendance_admin' },
  { id: '', email: `phase2-test-marks-${runId}@jeacademy.test`, role: 'marks_admin' },
]
const PASSWORD = `Test-${runId}-!Aa1`
let seedStudentId = ''

async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw error
  return client
}

beforeAll(async () => {
  for (const u of testUsers) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) throw error ?? new Error('createUser returned no user')
    u.id = data.user.id

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: u.id, role: u.role, email: u.email, full_name: `Phase 2 Test (${u.role})` })
    if (profileError) throw profileError
  }

  const { data: student, error: studentError } = await admin
    .from('students')
    .insert({
      roll_number: `JE-TEST-${runId}`,
      full_name: 'RLS Test Student',
      program: 'Matriculation',
      grade_level: '9',
      section: 'A',
    })
    .select('id')
    .single()
  if (studentError || !student) throw studentError ?? new Error('seed student insert returned no row')
  seedStudentId = student.id
}, 30_000)

afterAll(async () => {
  if (seedStudentId) await admin.from('students').delete().eq('id', seedStudentId)
  for (const u of testUsers) {
    if (u.id) await admin.auth.admin.deleteUser(u.id)
  }
}, 30_000)

describe('students RLS enforcement (live Supabase project)', () => {
  it('admissions_admin can select students', async () => {
    const client = await signInAs(testUsers[0].email)
    const { data, error } = await client.from('students').select('id').eq('id', seedStudentId).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(seedStudentId)
  })

  it('admissions_admin can insert and delete a student', async () => {
    const client = await signInAs(testUsers[0].email)
    const { data: inserted, error: insertError } = await client
      .from('students')
      .insert({ roll_number: `JE-TEST-INS-${runId}`, full_name: 'Insert Test', program: 'Matriculation', grade_level: '9', section: 'B' })
      .select('id')
      .single()
    expect(insertError).toBeNull()
    expect(inserted?.id).toBeTruthy()

    const { error: deleteError } = await client.from('students').delete().eq('id', inserted!.id)
    expect(deleteError).toBeNull()
  })

  it('attendance_admin can select students but cannot insert', async () => {
    const client = await signInAs(testUsers[1].email)

    const { data, error } = await client.from('students').select('id').eq('id', seedStudentId).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(seedStudentId)

    const { error: insertError } = await client
      .from('students')
      .insert({ roll_number: `JE-TEST-DENY-ATT-${runId}`, full_name: 'Should Not Insert', program: 'Matriculation', grade_level: '9', section: 'C' })
    expect(insertError).not.toBeNull()
  })

  it('marks_admin can select students but cannot insert or delete', async () => {
    const client = await signInAs(testUsers[2].email)

    const { data, error } = await client.from('students').select('id').eq('id', seedStudentId).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(seedStudentId)

    const { error: insertError } = await client
      .from('students')
      .insert({ roll_number: `JE-TEST-DENY-MARKS-${runId}`, full_name: 'Should Not Insert', program: 'Matriculation', grade_level: '9', section: 'D' })
    expect(insertError).not.toBeNull()

    const { error: deleteError } = await client.from('students').delete().eq('id', seedStudentId)
    expect(deleteError).toBeNull()
    // RLS on a denied delete does not error — it just matches zero rows.
    // Confirm the seed row is still there via the service-role client.
    const { data: stillThere } = await admin.from('students').select('id').eq('id', seedStudentId).maybeSingle()
    expect(stillThere?.id).toBe(seedStudentId)
  })
})
