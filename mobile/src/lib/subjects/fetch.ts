import { supabase } from '@/lib/supabase/client';
import { callMobileApi } from '@/lib/api/client';

export type Subject = {
  id: string;
  gradeLevel: string;
  name: string;
  type: 'compulsory' | 'elected';
};

// Ported from the web's lib/actions/subjects.ts fetchSubjects — a direct,
// RLS-scoped read (subjects has a broad staff-read policy), no service-role
// client needed, so this queries Supabase directly rather than going
// through app/api/mobile/** the way the write actions below do.
export async function fetchSubjects(): Promise<Subject[]> {
  const { data } = await supabase
    .from('subjects')
    .select('id, grade_level, name, type')
    .is('deleted_at', null)
    .order('grade_level', { ascending: true })
    .order('name', { ascending: true });

  return (data ?? []).map((s) => ({ id: s.id, gradeLevel: s.grade_level, name: s.name, type: s.type }));
}

export async function createSubjectAction(input: { gradeLevel: string; name: string; type: 'compulsory' | 'elected' }) {
  return callMobileApi<{ id: string }>('/api/mobile/subjects', input);
}

export async function removeSubjectAction(id: string) {
  return callMobileApi(`/api/mobile/subjects/${id}`, {}, 'DELETE');
}
