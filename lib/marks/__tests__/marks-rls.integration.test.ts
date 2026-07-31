// @vitest-environment node
//
// Phase 4 step 5 (BACKEND-IMPLEMENTATION-PLAN.md): prove marks' RLS policies
// are enforced at the database level, and that marks_edit_history is
// genuinely append-only — not just by application convention, but because no
// UPDATE/DELETE policy exists for ANY role, including marks_admin itself.
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
  { id: '', email: `phase4-test-marks-${runId}@jeacademy.test`, role: 'marks_admin' },
  { id: '', email: `phase4-test-attendance-${runId}@jeacademy.test`, role: 'attendance_admin' },
  { id: '', email: `phase4-test-admissions-${runId}@jeacademy.test`, role: 'admissions_admin' },
]

let studentId = ''
let seedMarkId = ''

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
    const { error: profileError } = await admin.from('profiles').insert({ id: u.id, role: u.role, email: u.email, full_name: `Phase 4 Test (${u.role})` })
    if (profileError) throw profileError
  }

  const { data: student, error: studentError } = await admin.from('students').insert({
    roll_number: `JE-TEST-MARKS-${runId}`, full_name: 'Marks Test Student', program: 'Matriculation', grade_level: '9', section: 'A',
  }).select('id').single()
  if (studentError || !student) throw studentError ?? new Error('seed student insert returned no row')
  studentId = student.id

  const { data: seedMark, error: markError } = await admin.from('marks').insert({
    student_id: studentId, subject: 'Mathematics', exam_type: 'monthly', score: 70, max_score: 100, term: '2026-test',
  }).select('id').single()
  if (markError || !seedMark) throw markError ?? new Error('seed mark insert returned no row')
  seedMarkId = seedMark.id
}, 30_000)

afterAll(async () => {
  await admin.from('marks_edit_history').delete().eq('mark_id', seedMarkId)
  await admin.from('marks').delete().eq('student_id', studentId)
  await admin.from('students').delete().eq('id', studentId)
  for (const u of staffUsers) if (u.id) await admin.auth.admin.deleteUser(u.id)
}, 30_000)

describe('marks RLS enforcement (live Supabase project)', () => {
  it('marks_admin can insert a mark', async () => {
    const client = await signInAs(staffUsers[0].email)
    const { data, error } = await client.from('marks')
      .insert({ student_id: studentId, subject: 'English', exam_type: 'monthly', score: 80, max_score: 100, term: '2026-test-2' })
      .select('id').single()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
    if (data?.id) await admin.from('marks').delete().eq('id', data.id)
  })

  it('attendance_admin cannot insert a mark', async () => {
    const client = await signInAs(staffUsers[1].email)
    const { error } = await client.from('marks')
      .insert({ student_id: studentId, subject: 'Physics', exam_type: 'monthly', score: 60, max_score: 100, term: '2026-test-deny-att' })

    expect(error).not.toBeNull()
  })

  it('admissions_admin cannot insert a mark', async () => {
    const client = await signInAs(staffUsers[2].email)
    const { error } = await client.from('marks')
      .insert({ student_id: studentId, subject: 'Chemistry', exam_type: 'monthly', score: 60, max_score: 100, term: '2026-test-deny-adm' })

    expect(error).not.toBeNull()
  })

  it('marks_admin can insert an edit-history row', async () => {
    const client = await signInAs(staffUsers[0].email)
    const { data, error } = await client.from('marks_edit_history')
      .insert({ mark_id: seedMarkId, previous_score: 70, new_score: 75 })
      .select('id').single()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })

  it('marks_admin CANNOT update an edit-history row (append-only, RLS-enforced)', async () => {
    const client = await signInAs(staffUsers[0].email)
    const { data: existing } = await admin.from('marks_edit_history').select('id').eq('mark_id', seedMarkId).limit(1).single()

    const { error, data } = await client.from('marks_edit_history')
      .update({ new_score: 999 })
      .eq('id', existing!.id)
      .select('id')

    // RLS on a denied update does not error — it just matches zero rows.
    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('marks_edit_history').select('new_score').eq('id', existing!.id).single()
    expect(unchanged?.new_score).not.toBe(999)
  })

  it('marks_admin CANNOT delete an edit-history row (append-only, RLS-enforced)', async () => {
    const client = await signInAs(staffUsers[0].email)
    const { data: existing } = await admin.from('marks_edit_history').select('id').eq('mark_id', seedMarkId).limit(1).single()

    await client.from('marks_edit_history').delete().eq('id', existing!.id)

    const { data: stillThere } = await admin.from('marks_edit_history').select('id').eq('id', existing!.id).maybeSingle()
    expect(stillThere?.id).toBe(existing!.id)
  })
})
