// @vitest-environment node
//
// Phase 6 step 6 (BACKEND-IMPLEMENTATION-PLAN.md): prove video_watch_sessions
// RLS is scoped exactly like attendance_records/marks — a parent can only
// read/write watch sessions for their own linked children, and a guessed
// studentId belonging to a different parent's child must be rejected by RLS
// itself, not just hidden by requireParentAccessToChild's redirect.
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
const parentAEmail = `phase6-test-parentA-${runId}@jeacademy.test`
const parentBEmail = `phase6-test-parentB-${runId}@jeacademy.test`

let parentAId = ''
let parentBId = ''
let studentAId = ''
let studentBId = ''
let lectureId = ''

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
  await admin.from('profiles').insert({ id: parentAId, role: 'parent', email: parentAEmail, full_name: 'Phase 6 Test Parent A' })

  const { data: parentB, error: parentBError } = await admin.auth.admin.createUser({ email: parentBEmail, password: PASSWORD, email_confirm: true })
  if (parentBError || !parentB.user) throw parentBError ?? new Error('createUser returned no user')
  parentBId = parentB.user.id
  await admin.from('profiles').insert({ id: parentBId, role: 'parent', email: parentBEmail, full_name: 'Phase 6 Test Parent B' })

  const { data: studentA, error: sAError } = await admin.from('students').insert({
    roll_number: `JE-TEST-P6-A-${runId}`, full_name: 'Phase6 Child A', program: 'Matriculation', grade_level: '9', section: 'A',
  }).select('id').single()
  if (sAError || !studentA) throw sAError ?? new Error('seed student A insert returned no row')
  studentAId = studentA.id

  const { data: studentB, error: sBError } = await admin.from('students').insert({
    roll_number: `JE-TEST-P6-B-${runId}`, full_name: 'Phase6 Child B', program: 'Matriculation', grade_level: '9', section: 'B',
  }).select('id').single()
  if (sBError || !studentB) throw sBError ?? new Error('seed student B insert returned no row')
  studentBId = studentB.id

  await admin.from('parent_student_links').insert([
    { parent_id: parentAId, student_id: studentAId },
    { parent_id: parentBId, student_id: studentBId },
  ])

  const { data: lecture } = await admin.from('video_lectures').select('id').limit(1).single()
  lectureId = lecture!.id

  await admin.from('video_watch_sessions').insert({ student_id: studentBId, lecture_id: lectureId, watched_seconds: 120 })
}, 30_000)

afterAll(async () => {
  await admin.from('video_watch_sessions').delete().in('student_id', [studentAId, studentBId])
  await admin.from('students').delete().in('id', [studentAId, studentBId])
  if (parentAId) await admin.auth.admin.deleteUser(parentAId)
  if (parentBId) await admin.auth.admin.deleteUser(parentBId)
}, 30_000)

describe('video_watch_sessions RLS enforcement (live Supabase project)', () => {
  it('any signed-in profile can read the video_lectures catalog', async () => {
    const client = await signInAs(parentAEmail)
    const { data, error } = await client.from('video_lectures').select('id').limit(1)
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })

  it('parent A can insert and read a watch session for their own linked child', async () => {
    const client = await signInAs(parentAEmail)
    const { data: inserted, error: insertError } = await client
      .from('video_watch_sessions')
      .insert({ student_id: studentAId, lecture_id: lectureId, watched_seconds: 30 })
      .select('id').single()

    expect(insertError).toBeNull()
    expect(inserted?.id).toBeTruthy()

    const { data, error } = await client.from('video_watch_sessions').select('watched_seconds').eq('student_id', studentAId).maybeSingle()
    expect(error).toBeNull()
    expect(data?.watched_seconds).toBe(30)
  })

  it("parent A cannot read parent B's child's watch session (off-by-one)", async () => {
    const client = await signInAs(parentAEmail)
    const { data, error } = await client.from('video_watch_sessions').select('id').eq('student_id', studentBId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it("parent A cannot insert a watch session for parent B's child, even guessing the studentId", async () => {
    const client = await signInAs(parentAEmail)
    const { error } = await client
      .from('video_watch_sessions')
      .insert({ student_id: studentBId, lecture_id: lectureId, watched_seconds: 999 })

    expect(error).not.toBeNull()

    // Confirm parent B's real row is untouched.
    const { data: stillIntact } = await admin.from('video_watch_sessions').select('watched_seconds').eq('student_id', studentBId).eq('lecture_id', lectureId).single()
    expect(stillIntact?.watched_seconds).toBe(120)
  })

  it("parent A cannot update parent B's child's watch session", async () => {
    const client = await signInAs(parentAEmail)
    const { data } = await client
      .from('video_watch_sessions')
      .update({ watched_seconds: 9999 })
      .eq('student_id', studentBId)
      .select('id')

    expect(data).toEqual([])

    const { data: stillIntact } = await admin.from('video_watch_sessions').select('watched_seconds').eq('student_id', studentBId).eq('lecture_id', lectureId).single()
    expect(stillIntact?.watched_seconds).toBe(120)
  })
})
