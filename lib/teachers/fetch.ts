import { createClient } from '@/lib/supabase/server'

export type Teacher = {
  id: string
  full_name: string
  subject: string
  classes: string[]
  email: string | null
  phone: string | null
}

// Runs on the caller's own RLS-scoped session — teachers' super_admin_full_access
// policy is what actually authorizes this, not application logic.
export async function fetchTeachers(): Promise<Teacher[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('teachers')
    .select('id, full_name, subject, classes, email, phone')
    .order('full_name', { ascending: true })

  return data ?? []
}
