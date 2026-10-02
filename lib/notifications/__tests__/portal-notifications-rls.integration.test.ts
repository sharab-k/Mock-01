// @vitest-environment node
//
// CLAUDE.md §12: RLS tested as each role's own JWT. portal_notifications is
// the parent's in-app inbox — a parent must see only their own rows, may only
// flip read_at on them, and can never create or rewrite a notification (those
// come from the server pipeline via the service-role client only).
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
const emailA = `notif-test-parentA-${runId}@jeacademy.test`
const emailB = `notif-test-parentB-${runId}@jeacademy.test`

let parentAId = ''
let parentBId = ''
let studentAId = ''
let studentBId = ''
let notifAId = ''
let notifBId = ''

async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw error
  return client
}

async function seedParent(email: string, name: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser returned no user')
  await admin.from('profiles').insert({ id: data.user.id, role: 'parent', email, full_name: name })
  return data.user.id
}

async function seedStudent(tag: string, section: string) {
  const { data, error } = await admin.from('students').insert({
    roll_number: `JE-TEST-NT-${tag}-${runId}`, registration_number: `JE-TEST-REG-NT-${tag}-${runId}`, academic_year: 2026,
    full_name: `Notif Child ${tag}`, program: 'Matriculation', grade_level: '9', section,
  }).select('id').single()
  if (error || !data) throw error ?? new Error('seed student returned no row')
  return data.id
}

beforeAll(async () => {
  parentAId = await seedParent(emailA, 'Notif Test Parent A')
  parentBId = await seedParent(emailB, 'Notif Test Parent B')
  studentAId = await seedStudent('A', 'A')
  studentBId = await seedStudent('B', 'B')
  await admin.from('parent_student_links').insert([
    { parent_id: parentAId, student_id: studentAId },
    { parent_id: parentBId, student_id: studentBId },
  ])

  const { data: a } = await admin.from('portal_notifications').insert({ parent_id: parentAId, student_id: studentAId, kind: 'absence', title: 'A alert', body: 'for parent A', parent_name: 'Notif Test Parent A' }).select('id').single()
  const { data: b } = await admin.from('portal_notifications').insert({ parent_id: parentBId, student_id: studentBId, kind: 'absence', title: 'B alert', body: 'for parent B', parent_name: 'Notif Test Parent B' }).select('id').single()
  notifAId = a!.id
  notifBId = b!.id
})

afterAll(async () => {
  // portal_notifications / links cascade from students + profiles.
  await admin.from('students').delete().in('id', [studentAId, studentBId])
  await admin.auth.admin.deleteUser(parentAId)
  await admin.auth.admin.deleteUser(parentBId)
})

describe('portal_notifications RLS (live Supabase project)', () => {
  it("a parent's inbox contains exactly their own notification — never another parent's", async () => {
    const parentA = await signInAs(emailA)
    const { data } = await parentA.from('portal_notifications').select('id')
    expect((data ?? []).map((r) => r.id)).toEqual([notifAId])
  })

  it("a parent cannot read another parent's notification directly by id", async () => {
    const parentA = await signInAs(emailA)
    const { data } = await parentA.from('portal_notifications').select('id').eq('id', notifBId)
    expect(data).toEqual([])
  })

  it('a parent can mark their own notification as read', async () => {
    const parentA = await signInAs(emailA)
    const { error } = await parentA.from('portal_notifications').update({ read_at: new Date().toISOString() }).eq('id', notifAId)
    expect(error).toBeNull()
    const { data } = await admin.from('portal_notifications').select('read_at').eq('id', notifAId).single()
    expect(data?.read_at).not.toBeNull()
  })

  it("a parent cannot mark another parent's notification as read", async () => {
    const parentA = await signInAs(emailA)
    await parentA.from('portal_notifications').update({ read_at: new Date().toISOString() }).eq('id', notifBId)
    const { data } = await admin.from('portal_notifications').select('read_at').eq('id', notifBId).single()
    expect(data?.read_at).toBeNull()
  })

  it('a parent cannot rewrite the message of their own notification (read_at is the only writable column)', async () => {
    const parentA = await signInAs(emailA)
    const { error } = await parentA.from('portal_notifications').update({ body: 'tampered' }).eq('id', notifAId)
    expect(error).not.toBeNull()
    const { data } = await admin.from('portal_notifications').select('body').eq('id', notifAId).single()
    expect(data?.body).toBe('for parent A')
  })

  it('a parent cannot create a notification (server pipeline only)', async () => {
    const parentA = await signInAs(emailA)
    const { error } = await parentA.from('portal_notifications').insert({ parent_id: parentAId, student_id: studentAId, kind: 'grade', title: 'forged', body: 'forged', parent_name: 'x' })
    expect(error).not.toBeNull()
  })
})
