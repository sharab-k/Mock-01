import { supabase } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/db/fetch-all';

export type AttendancePct = { pct: number; present: number; total: number };

// Mirrors the web's lib/attendance/attendance-stats.ts. Late counts as
// "attended" — a late arrival still means the student was in class. Added up by
// the database (attendance_student_stats), not by downloading every row.
export async function fetchAttendancePercentages(): Promise<Map<string, AttendancePct>> {
  const { data } = await supabase.rpc('attendance_student_stats');

  const result = new Map<string, AttendancePct>();
  for (const row of data ?? []) {
    const present = Number(row.present);
    const total = Number(row.total);
    result.set(row.student_id, { pct: total > 0 ? Math.round((present / total) * 100) : 0, present, total });
  }
  return result;
}

export async function fetchActiveStudents() {
  return fetchAllRows((from, to) =>
    supabase
      .from('students')
      .select('id, roll_number, full_name, grade_level, section')
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('roll_sort', { ascending: true })
      .order('id')
      .range(from, to),
  );
}
