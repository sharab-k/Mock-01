'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!supabaseUrl.startsWith('https')) {
    redirect('/login?error=supabase_not_configured')
  }

  const supabase = await createClient()

  // Always redirect to the same "check your email" state whether or not the
  // account exists — resetPasswordForEmail doesn't error on unknown emails
  // either, so this avoids leaking which addresses are registered.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  })

  redirect('/forgot-password?sent=1')
}
