'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'

const ResetPasswordSchema = z.object({
  password: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export async function updatePassword(formData: FormData) {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((i) => i.path[0] === 'confirmPassword')
    redirect(`/reset-password?error=${mismatch ? 'password_mismatch' : 'weak_password'}`)
  }

  const supabase = await createClient()

  // Requires the recovery session set by app/auth/callback/route.ts's
  // exchangeCodeForSession — no session means the link was invalid/expired.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=reset_link_invalid')

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) redirect('/reset-password?error=weak_password')

  // Logged before signOut() — audit_log's insert_own_actions RLS policy
  // needs auth.uid(), and logAction swallows errors silently, so doing this
  // after signing out would fail invisibly forever.
  await logAction(supabase, user.id, 'Password reset completed')

  await supabase.auth.signOut()
  redirect('/login?success=password_updated')
}
