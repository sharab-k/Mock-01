import { supabase } from '@/lib/supabase/client';
import { GRADES } from '@/lib/students/constants';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type WeekTrendPoint = { week: string; rate: number };

export type AttendanceReportsData = {
  monthTrend: WeekTrendPoint[];
  classComparison: Record<string, number>;
  classTotals: Record<string, number>;
};

// Ported from the web's lib/attendance/reports-data.ts.
export async function fetchAttendanceReportsData(): Promise<AttendanceReportsData> {
  const [studentsRes, recordsRes] = await Promise.all([
    supabase.from('students').select('grade_level, section').is('deleted_at', null).eq('status', 'active'),
    supabase.from('attendance_records').select('class_date, status, students(grade_level)'),
  ]);

  const classTotals: Record<string, number> = {};
  for (const g of GRADES) classTotals[g] = 0;
  for (const row of studentsRes.data ?? []) {
    if (row.grade_level in classTotals) classTotals[row.grade_level]++;
  }

  const records = recordsRes.data ?? [];
  const rateOf = (rows: typeof records) => {
    const attended = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
    return rows.length > 0 ? Math.round((attended / rows.length) * 100) : 0;
  };

  const monthTrend: WeekTrendPoint[] = Array.from({ length: 4 }, (_, i) => {
    const bucketsFromToday = 3 - i;
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - bucketsFromToday * 7);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    const startStr = isoDate(start);
    const endStr = isoDate(end);
    const bucketRows = records.filter((r) => r.class_date >= startStr && r.class_date <= endStr);
    return { week: `Week ${i + 1}`, rate: rateOf(bucketRows) };
  });

  const classComparison: Record<string, number> = {};
  for (const grade of GRADES) {
    const gradeRows = records.filter((r) => r.students?.grade_level === grade);
    classComparison[grade] = rateOf(gradeRows);
  }

  return { monthTrend, classComparison, classTotals };
}
