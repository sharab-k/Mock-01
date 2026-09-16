import { createClient } from '@/lib/supabase/server'
import { GRADE_SECTION_PAIRS } from '@/lib/students/constants'
import type { MarkerClass } from '@/components/dashboard/AttendanceMarker'

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

// Builds the class list for the standalone /attendance/mark quick-marker —
// every grade+section combo the school actually has (GRADE_SECTION_PAIRS),
// not just the ones with enrolled students today, so a class that hasn't
// been enrolled into yet still shows up (with 0 students) instead of
// silently vanishing from the picker. This app has no fixed period
// schedule, so grade+section stands in for "class".
export async function fetchMarkerClasses(): Promise<MarkerClass[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  const byClass = new Map<string, MarkerClass>()
  for (const { grade, section } of GRADE_SECTION_PAIRS) {
    byClass.set(`${grade}-${section}`, { id: `${grade}-${section}`, label: `Grade ${grade} · Section ${section}`, students: [] })
  }
  for (const s of data ?? []) {
    const key = `${s.grade_level}-${s.section}`
    byClass.get(key)?.students.push({ id: s.id, name: s.full_name, roll: s.roll_number, initials: INITIALS(s.full_name) })
  }

  return Array.from(byClass.values())
}
