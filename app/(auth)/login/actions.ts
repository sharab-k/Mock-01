'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_DESTINATIONS } from '@/lib/auth/role-destinations'

export async function login(formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  // Guard: Supabase not yet configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!supabaseUrl.startsWith('https')) {
    redirect('/login?error=supabase_not_configured')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  // Read role and redirect to the correct portal
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=invalid_credentials')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profile && !profile.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=account_inactive')
  }

  const destination = profile ? ROLE_DESTINATIONS[profile.role] : undefined
  redirect(destination ?? '/login?error=no_role')
}
