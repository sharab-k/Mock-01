import { supabase } from '@/lib/supabase/client';

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export type MarkerStudent = { id: string; name: string; roll: string; initials: string };
export type MarkerClass = { id: string; label: string; students: MarkerStudent[] };

// Ported from the web's lib/attendance/marker-classes.ts — one entry per
// grade+section combo that actually has enrolled students, no fixed
// timetable model.
export async function fetchMarkerClasses(): Promise<MarkerClass[]> {
  const { data } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('grade_level', { ascending: true })
    .order('section', { ascending: true })
    .order('full_name', { ascending: true });

  const byClass = new Map<string, MarkerClass>();
  for (const s of data ?? []) {
    const key = `${s.grade_level}-${s.section}`;
    if (!byClass.has(key)) {
      byClass.set(key, { id: key, label: `Grade ${s.grade_level} · Section ${s.section}`, students: [] });
    }
    byClass.get(key)!.students.push({ id: s.id, name: s.full_name, roll: s.roll_number, initials: INITIALS(s.full_name) });
  }

  return Array.from(byClass.values());
}
