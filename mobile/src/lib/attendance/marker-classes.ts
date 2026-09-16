import { supabase } from '@/lib/supabase/client';
import { GRADE_SECTION_PAIRS } from '@/lib/students/constants';

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export type MarkerStudent = { id: string; name: string; roll: string; initials: string };
export type MarkerClass = { id: string; grade: string; section: string; label: string; students: MarkerStudent[] };

// Ported from the web's lib/attendance/marker-classes.ts — every grade+section
// combo the school has (GRADE_SECTION_PAIRS), not just the ones with
// enrolled students today, so an empty class still shows up in the picker
// instead of silently vanishing. No fixed timetable model in this app.
export async function fetchMarkerClasses(): Promise<MarkerClass[]> {
  const { data } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('full_name', { ascending: true });

  const byClass = new Map<string, MarkerClass>();
  for (const { grade, section } of GRADE_SECTION_PAIRS) {
    byClass.set(`${grade}-${section}`, { id: `${grade}-${section}`, grade, section, label: `Grade ${grade} · Section ${section}`, students: [] });
  }
  for (const s of data ?? []) {
    const key = `${s.grade_level}-${s.section}`;
    byClass.get(key)?.students.push({ id: s.id, name: s.full_name, roll: s.roll_number, initials: INITIALS(s.full_name) });
  }

  return Array.from(byClass.values());
}
