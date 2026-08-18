import { supabase } from '@/lib/supabase/client';

export type AttendancePct = { pct: number; present: number; total: number };

// Ported from the web's lib/attendance/attendance-stats.ts. Late counts as
// "attended" — a late arrival still means the student was in class.
export async function fetchAttendancePercentages(): Promise<Map<string, AttendancePct>> {
  const { data } = await supabase.from('attendance_records').select('student_id, status');

  const byStudent = new Map<string, { present: number; total: number }>();
  for (const row of data ?? []) {
    const cur = byStudent.get(row.student_id) ?? { present: 0, total: 0 };
    if (row.status === 'present' || row.status === 'late') cur.present++;
    cur.total++;
    byStudent.set(row.student_id, cur);
  }

  const result = new Map<string, AttendancePct>();
  for (const [id, v] of byStudent) {
    result.set(id, { pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0, present: v.present, total: v.total });
  }
  return result;
}

export async function fetchActiveStudents() {
  const { data } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('full_name', { ascending: true });
  return data ?? [];
}
