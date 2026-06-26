'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ROLE_DESTINATIONS: Record<string, string> = {
  super_admin:       '/super-admin',
  admissions_admin:  '/admissions',
  attendance_admin:  '/attendance',
  marks_admin:       '/marks',
  teacher:           '/teacher',
  student:           '/student',
  parent:            '/parent',
}

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

  const result = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (result.data as { role: string } | null)?.role ?? ''
  const destination = ROLE_DESTINATIONS[role] ?? '/login?error=no_role'
  redirect(destination)
}
