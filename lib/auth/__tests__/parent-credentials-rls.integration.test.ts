// @vitest-environment node
//
// CLAUDE.md §12: RLS tested as real role JWTs. parent_credentials holds the
// recoverable (encrypted) parent passwords — RLS is enabled with NO policies, so
// not even Super Admin's own session may read or write it directly; only the
// server's service-role client (via lib/auth/credential-vault.ts) can.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const runId = Date.now()
const PASSWORD = `Test-${runId}-!Aa1`
const roles = ['super_admin', 'marks_admin', 'parent'] as const
const emails = Object.fromEntries(roles.map((r) => [r, `vault-test-${r}-${runId}@jeacademy.test`])) as Record<(typeof roles)[number], string>
const ids: Record<string, string> = {}

async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw error
  return client
}

beforeAll(async () => {
  for (const role of roles) {
    const { data, error } = await admin.auth.admin.createUser({ email: emails[role], password: PASSWORD, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('createUser returned no user')
    ids[role] = data.user.id
    await admin.from('profiles').insert({ id: data.user.id, role, email: emails[role], full_name: `Vault Test ${role}` })
  }
  await admin.from('parent_credentials').insert({ parent_id: ids.parent, password_enc: 'v1.test.test.test', set_by: ids.super_admin })
})

afterAll(async () => {
  for (const role of roles) await admin.auth.admin.deleteUser(ids[role]) // cascades profiles + vault row
})

describe('parent_credentials RLS (live Supabase project)', () => {
  it('the service-role client can read the vault (the only path that can)', async () => {
    const { data } = await admin.from('parent_credentials').select('parent_id').eq('parent_id', ids.parent)
    expect(data).toHaveLength(1)
  })

  it.each(roles)('%s cannot read any vault row directly', async (role) => {
    const client = await signInAs(emails[role])
    const { data } = await client.from('parent_credentials').select('*')
    expect(data ?? []).toEqual([])
  })

  it('a parent cannot read even their own vault row', async () => {
    const parent = await signInAs(emails.parent)
    const { data } = await parent.from('parent_credentials').select('*').eq('parent_id', ids.parent)
    expect(data ?? []).toEqual([])
  })

  it.each(roles)('%s cannot insert, update or delete vault rows', async (role) => {
    const client = await signInAs(emails[role])
    const insert = await client.from('parent_credentials').insert({ parent_id: ids[role], password_enc: 'x' })
    expect(insert.error).not.toBeNull()

    await client.from('parent_credentials').update({ password_enc: 'tampered' }).eq('parent_id', ids.parent)
    await client.from('parent_credentials').delete().eq('parent_id', ids.parent)
    const { data } = await admin.from('parent_credentials').select('password_enc').eq('parent_id', ids.parent).single()
    expect(data?.password_enc).toBe('v1.test.test.test') // untouched
  })
})
