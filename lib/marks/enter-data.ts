import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/db/fetch-all'

export type EnterRosterStudent = { id: string; full_name: string; roll_number: string; grade: string; section: string }

// Just the roster. The marks already saved for the selected class/subject/exam/
// date are fetched on demand (fetchExistingMarksAction) — this used to download
// every mark in the school up front, which was slow and silently truncated at
// 1,000 rows.
export async function fetchMarksEntryData(): Promise<{ roster: EnterRosterStudent[] }> {
  const supabase = await createClient()
  const students = await fetchAllRows((from, to) =>
    supabase.from('students').select('id, full_name, roll_number, grade_level, section').is('deleted_at', null).eq('status', 'active').order('list_sort', { ascending: true }).order('id').range(from, to),
  )

  return {
    roster: students.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      roll_number: s.roll_number,
      grade: s.grade_level,
      section: s.section,
    })),
  }
}
