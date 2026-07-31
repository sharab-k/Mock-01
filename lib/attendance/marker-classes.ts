import { createClient } from '@/lib/supabase/server'
import type { MarkerClass } from '@/components/dashboard/AttendanceMarker'

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

// Builds the class list for the standalone /attendance/mark quick-marker —
// one entry per grade+section combo that actually has enrolled students,
// rather than a fixed period schedule (this app has no timetable model).
export async function fetchMarkerClasses(): Promise<MarkerClass[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('grade_level', { ascending: true })
    .order('section', { ascending: true })
    .order('full_name', { ascending: true })

  const byClass = new Map<string, MarkerClass>()
  for (const s of data ?? []) {
    const key = `${s.grade_level}-${s.section}`
    if (!byClass.has(key)) {
      byClass.set(key, { id: key, label: `Grade ${s.grade_level} · Section ${s.section}`, students: [] })
    }
    byClass.get(key)!.students.push({ id: s.id, name: s.full_name, roll: s.roll_number, initials: INITIALS(s.full_name) })
  }

  return Array.from(byClass.values())
}
