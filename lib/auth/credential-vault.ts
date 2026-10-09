import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret, SecretDecryptError, SecretKeyError } from './secret-box'

// The only code that reads or writes public.parent_credentials. That table has
// RLS enabled with no policies, so it is reachable solely through the
// service-role client used here — and the only callers are the actions that set
// a parent's password and the Super-Admin-only reveal action.

// Records the (encrypted) password just set on a parent's account. If it can't
// be stored (e.g. the key isn't configured on this deployment) any previous
// entry is deleted rather than left behind: a stale password shown as current
// would be worse than "not on record".
export async function storeParentPassword(parentId: string, password: string, setBy: string | null): Promise<boolean> {
  const admin = createAdminClient()
  try {
    const { error } = await admin.from('parent_credentials').upsert({
      parent_id: parentId,
      password_enc: encryptSecret(password),
      set_by: setBy,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return true
  } catch {
    await admin.from('parent_credentials').delete().eq('parent_id', parentId)
    return false
  }
}

export type PasswordLookup =
  | { ok: true; password: string }
  | { ok: false; reason: 'not_recorded' | 'key_missing' | 'key_mismatch' }

export async function readParentPassword(parentId: string): Promise<PasswordLookup> {
  const admin = createAdminClient()
  const { data } = await admin.from('parent_credentials').select('password_enc').eq('parent_id', parentId).maybeSingle()
  if (!data) return { ok: false, reason: 'not_recorded' }
  try {
    return { ok: true, password: decryptSecret(data.password_enc) }
  } catch (err) {
    if (err instanceof SecretKeyError) return { ok: false, reason: 'key_missing' }
    if (err instanceof SecretDecryptError) return { ok: false, reason: 'key_mismatch' }
    throw err
  }
}

// Which of these parents have a recoverable password on record — just
// existence, never the secret, so the directory can show/hide "Show password".
export async function parentsWithStoredPassword(parentIds: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  if (parentIds.length === 0) return found
  const admin = createAdminClient()

  // `.in()` puts every id in the request URL; ~500 UUIDs overflows it and the
  // query fails silently (data comes back null), which would show every parent
  // as "not on record". Ask in batches instead.
  const BATCH = 100
  for (let i = 0; i < parentIds.length; i += BATCH) {
    const { data, error } = await admin.from('parent_credentials').select('parent_id').in('parent_id', parentIds.slice(i, i + BATCH))
    if (error) throw error
    for (const row of data ?? []) found.add(row.parent_id)
  }
  return found
}
