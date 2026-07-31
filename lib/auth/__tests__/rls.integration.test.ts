// @vitest-environment node
//
// Hits the real linked Supabase project — CLAUDE.md §12's first testing
// priority: "test as each role's JWT, not just logged in vs not." This
// creates two throwaway auth.users (never the real seeded Super Admin) and
// proves the `select_own_profile` RLS policy actually enforces at the
// database level, not just that the app happens to query correctly.
//
// NOTE: only 2 of the 6 roles are exercised here. The other 4 (admissions/
// attendance/marks admin, plus a second student/parent) don't have real
// accounts yet — those get created in later phases (sub-admins in Phase 9,
// students/parents in Phase 2). Extend this file's ROLES list as each
// phase's account-creation flow lands, rather than writing a separate test.
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
  { id: '', email: `phase1-test-student-${runId}@jeacademy.test`, role: 'student' },
  { id: '', email: `phase1-test-parent-${runId}@jeacademy.test`, role: 'parent' },
]
const PASSWORD = `Test-${runId}-!Aa1`

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
      .insert({ id: u.id, role: u.role, email: u.email, full_name: `Phase 1 Test (${u.role})` })
    if (profileError) throw profileError
  }
}, 30_000)

afterAll(async () => {
  for (const u of testUsers) {
    if (u.id) await admin.auth.admin.deleteUser(u.id)
  }
}, 30_000)

describe('profiles RLS enforcement (live Supabase project)', () => {
  it('a signed-in user can select their own profile row', async () => {
    const student = testUsers[0]
    const client = await signInAs(student.email)

    const { data, error } = await client.from('profiles').select('*').eq('id', student.id).single()

    expect(error).toBeNull()
    expect(data?.role).toBe('student')
    expect(data?.email).toBe(student.email)
  })

  it('a signed-in user cannot select a different user\'s profile row', async () => {
    const student = testUsers[0]
    const parent = testUsers[1]
    const client = await signInAs(student.email)

    // RLS silently filters non-matching rows rather than erroring — a
    // maybeSingle() (not single()) query for someone else's id must come
    // back empty, not the parent's real row.
    const { data, error } = await client.from('profiles').select('*').eq('id', parent.id).maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('an unauthenticated client cannot read any profile rows', async () => {
    const anon = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await anon.from('profiles').select('*')

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('current_role() reflects the signed-in user\'s real role', async () => {
    const parent = testUsers[1]
    const client = await signInAs(parent.email)

    const { data, error } = await client.rpc('current_role')

    expect(error).toBeNull()
    expect(data).toBe('parent')
  })
})
