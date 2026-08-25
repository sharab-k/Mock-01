'use server'

import { createClient } from '@/lib/supabase/server'
import { generateTempPassword } from '@/lib/auth/generate-credentials'

// Powers SetPasswordModal's "Generate" convenience button — reuses the exact
// same crypto-safe generator as new-account creation, just exposed as an
// action since generateTempPassword lives in a server-only module. Any
// signed-in staff/admin can call this — it produces a random string with no
// dependency on any account's data, so there's nothing to authorize beyond
// "is this a real session," same bar as any other server action.
export async function suggestPasswordAction(): Promise<{ password: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { password: '' }
  return { password: generateTempPassword() }
}
