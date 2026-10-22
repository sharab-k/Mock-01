import { supabase } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { GRADES, sectionsForGrade } from '@/lib/students/constants';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDates(n: number, offsetDays = 0): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - offsetDays - (n - 1 - i));
    return isoDate(d);
  });
}

export type ClassAttendanceStat = { present: number; absent: number; late: number; total: number };
export type DayAttendanceStat = { day: string; date: string; present: number; absent: number; late: number; total: number; isToday: boolean };

export type AttendanceDashboardData = {
  todayLabel: string;
  classStats: Record<string, Record<string, ClassAttendanceStat>>;
  week: DayAttendanceStat[];
  lastWeekAvg: number;
};

// Ported from the web's lib/attendance/dashboard-data.ts.
export async function fetchAttendanceDashboardData(): Promise<AttendanceDashboardData> {
  const today = isoDate(new Date());
  const thisWeekDates = lastNDates(5);
  const priorWeekDates = lastNDates(5, 5);

  // Counts come from the database rather than downloading every attendance row
  // (a school week is ~2,900+ rows, past the 1,000-row response limit).
  const [students, todayRes, weekRes, priorWeekRes] = await Promise.all([
    fetchAllRows((from, to) => supabase.from('students').select('grade_level, section').is('deleted_at', null).eq('status', 'active').order('id').range(from, to)),
    supabase.rpc('attendance_class_day', { p_date: today }),
    supabase.rpc('attendance_day_stats', { p_dates: thisWeekDates }),
    supabase.rpc('attendance_day_stats', { p_dates: priorWeekDates }),
  ]);

  const classStats: Record<string, Record<string, ClassAttendanceStat>> = {};
  for (const g of GRADES) {
    classStats[g] = {};
    for (const s of sectionsForGrade(g)) classStats[g][s] = { present: 0, absent: 0, late: 0, total: 0 };
  }
  for (const row of students) {
    if (classStats[row.grade_level]?.[row.section]) classStats[row.grade_level][row.section].total++;
  }
  for (const row of todayRes.data ?? []) {
    const stat = classStats[row.grade_level]?.[row.section];
    if (stat && row.status in stat) (stat as unknown as Record<string, number>)[row.status] += Number(row.n);
  }

  const totalEnrolled = Object.values(classStats).flatMap((g) => Object.values(g)).reduce((a, c) => a + c.total, 0);

  const week: DayAttendanceStat[] = thisWeekDates.map((date) => {
    const day = (weekRes.data ?? []).find((r) => r.class_date === date);
    const present = Number(day?.present ?? 0);
    const absent = Number(day?.absent ?? 0);
    const late = Number(day?.late ?? 0);
    return {
      day: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
      date: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      present, absent, late,
      total: totalEnrolled,
      isToday: date === today,
    };
  });

  const priorRates = priorWeekDates.map((date) => {
    const present = Number((priorWeekRes.data ?? []).find((r) => r.class_date === date)?.present ?? 0);
    return totalEnrolled > 0 ? (present / totalEnrolled) * 100 : 0;
  });
  const lastWeekAvg = priorRates.length > 0 ? Math.round(priorRates.reduce((a, b) => a + b, 0) / priorRates.length) : 0;

  return {
    todayLabel: new Date(`${today}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    classStats,
    week,
    lastWeekAvg,
  };
}
