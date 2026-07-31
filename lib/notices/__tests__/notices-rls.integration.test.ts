// @vitest-environment node
//
// Phase 8 step 2 (BACKEND-IMPLEMENTATION-PLAN.md): only super_admin writes;
// every other role gets audience-scoped read access to PUBLISHED notices
// only. Proves each audience boundary explicitly rather than trusting the
// policy SQL alone.
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

const users: StaffUser[] = [
  { id: '', email: `phase8-test-super-${runId}@jeacademy.test`, role: 'super_admin' },
  { id: '', email: `phase8-test-admissions-${runId}@jeacademy.test`, role: 'admissions_admin' },
  { id: '', email: `phase8-test-parent-${runId}@jeacademy.test`, role: 'parent' },
]

let noticeAllId = ''
let noticeStaffId = ''
let noticeParentsId = ''
let noticeStudentsId = ''
let noticeDraftId = ''

async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw error
  return client
}

beforeAll(async () => {
  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: PASSWORD, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('createUser returned no user')
    u.id = data.user.id
    const { error: profileError } = await admin.from('profiles').insert({ id: u.id, role: u.role, email: u.email, full_name: `Phase 8 Test (${u.role})` })
    if (profileError) throw profileError
  }

  const inserts = await Promise.all([
    admin.from('notices').insert({ title: 'P8 All', body: 'body', category: 'Event', audience: 'All', published: true }).select('id').single(),
    admin.from('notices').insert({ title: 'P8 Staff', body: 'body', category: 'Event', audience: 'Staff', published: true }).select('id').single(),
    admin.from('notices').insert({ title: 'P8 Parents', body: 'body', category: 'Event', audience: 'Parents', published: true }).select('id').single(),
    admin.from('notices').insert({ title: 'P8 Students', body: 'body', category: 'Event', audience: 'Students', published: true }).select('id').single(),
    admin.from('notices').insert({ title: 'P8 Draft', body: 'body', category: 'Event', audience: 'All', published: false }).select('id').single(),
  ])
  for (const r of inserts) if (r.error || !r.data) throw r.error ?? new Error('seed notice insert returned no row')
  noticeAllId = inserts[0].data!.id
  noticeStaffId = inserts[1].data!.id
  noticeParentsId = inserts[2].data!.id
  noticeStudentsId = inserts[3].data!.id
  noticeDraftId = inserts[4].data!.id
}, 30_000)

afterAll(async () => {
  await admin.from('notices').delete().in('id', [noticeAllId, noticeStaffId, noticeParentsId, noticeStudentsId, noticeDraftId])
  for (const u of users) if (u.id) await admin.auth.admin.deleteUser(u.id)
}, 30_000)

describe('notices RLS enforcement (live Supabase project)', () => {
  it('anon sees only published, All-audience notices — not Staff/Parents/Students/drafts', async () => {
    const anon = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await anon.from('notices').select('id').in('id', [noticeAllId, noticeStaffId, noticeParentsId, noticeStudentsId, noticeDraftId])

    expect(error).toBeNull()
    expect((data ?? []).map((n) => n.id)).toEqual([noticeAllId])
  })

  it('admissions_admin (staff) sees All + Staff notices, not Parents/Students/drafts', async () => {
    const client = await signInAs(users[1].email)
    const { data, error } = await client.from('notices').select('id').in('id', [noticeAllId, noticeStaffId, noticeParentsId, noticeStudentsId, noticeDraftId])

    expect(error).toBeNull()
    expect((data ?? []).map((n) => n.id).sort()).toEqual([noticeAllId, noticeStaffId].sort())
  })

  it('parent sees All + Parents + Students notices, not Staff/drafts', async () => {
    const client = await signInAs(users[2].email)
    const { data, error } = await client.from('notices').select('id').in('id', [noticeAllId, noticeStaffId, noticeParentsId, noticeStudentsId, noticeDraftId])

    expect(error).toBeNull()
    expect((data ?? []).map((n) => n.id).sort()).toEqual([noticeAllId, noticeParentsId, noticeStudentsId].sort())
  })

  it('super_admin sees everything, including drafts', async () => {
    const client = await signInAs(users[0].email)
    const { data, error } = await client.from('notices').select('id').in('id', [noticeAllId, noticeStaffId, noticeParentsId, noticeStudentsId, noticeDraftId])

    expect(error).toBeNull()
    expect(data?.length).toBe(5)
  })

  it('admissions_admin (non-super_admin) cannot insert a notice', async () => {
    const client = await signInAs(users[1].email)
    const { error } = await client.from('notices').insert({ title: 'Should fail', body: 'body', category: 'Event', audience: 'All' })
    expect(error).not.toBeNull()
  })

  it('parent cannot insert or update a notice', async () => {
    const client = await signInAs(users[2].email)
    const { error: insertError } = await client.from('notices').insert({ title: 'Should fail', body: 'body', category: 'Event', audience: 'All' })
    expect(insertError).not.toBeNull()

    const { data: updateData } = await client.from('notices').update({ title: 'Hacked' }).eq('id', noticeAllId).select('id')
    expect(updateData).toEqual([])
  })

  it('super_admin can insert, update, and unpublish a notice', async () => {
    const client = await signInAs(users[0].email)
    const { data: inserted, error: insertError } = await client
      .from('notices')
      .insert({ title: 'Super Admin Insert', body: 'body', category: 'Academic', audience: 'All' })
      .select('id').single()
    expect(insertError).toBeNull()
    expect(inserted?.id).toBeTruthy()

    const { error: updateError } = await client.from('notices').update({ published: false }).eq('id', inserted!.id)
    expect(updateError).toBeNull()

    await admin.from('notices').delete().eq('id', inserted!.id)
  })
})
