import { NextResponse } from 'next/server'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { generateTempPassword } from '@/lib/auth/generate-credentials'

// Powers the mobile SetPasswordModal's "Generate" button — reuses the same
// crypto-safe generator as new-account creation and web's suggestPasswordAction.
// Any authenticated session can call this; it produces a random string with
// no dependency on any account's data.
export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  return NextResponse.json({ password: generateTempPassword() })
}
