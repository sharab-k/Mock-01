import { supabase } from '@/lib/supabase/client';

export type Teacher = {
  id: string;
  full_name: string;
  subject: string;
  classes: string[];
  email: string | null;
  phone: string | null;
};

// Ported from the web's lib/teachers/fetch.ts — teachers'
// super_admin_full_access RLS policy authorizes this directly, no admin
// client needed.
export async function fetchTeachers(): Promise<Teacher[]> {
  const { data } = await supabase
    .from('teachers')
    .select('id, full_name, subject, classes, email, phone')
    .order('full_name', { ascending: true });

  return data ?? [];
}
