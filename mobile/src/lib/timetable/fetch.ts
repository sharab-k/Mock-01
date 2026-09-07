import { supabase } from '@/lib/supabase/client';
import { callMobileApi } from '@/lib/api/client';

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type Weekday = typeof WEEKDAYS[number];
export const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};

export type TimetablePeriod = {
  id: string;
  gradeLevel: string;
  section: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string | null;
  teacherName: string | null;
};

// Ported from the web's lib/actions/timetable.ts fetchClassTimetable —
// direct RLS-scoped read (class_timetable_periods is super_admin-only,
// which is exactly who can reach this screen), no service-role client
// needed.
export async function fetchClassTimetable(gradeLevel: string, section: string): Promise<TimetablePeriod[]> {
  const { data } = await supabase
    .from('class_timetable_periods')
    .select('id, grade_level, section, day_of_week, start_time, end_time, subject, teacher_id, teachers(full_name)')
    .eq('grade_level', gradeLevel)
    .eq('section', section)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id,
    gradeLevel: p.grade_level,
    section: p.section,
    dayOfWeek: p.day_of_week as Weekday,
    startTime: p.start_time,
    endTime: p.end_time,
    subject: p.subject,
    teacherId: p.teacher_id,
    teacherName: p.teachers?.full_name ?? null,
  }));
}

export type PeriodInput = {
  gradeLevel: string;
  section: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
};

export async function createTimetablePeriodAction(input: PeriodInput) {
  return callMobileApi<{ id: string }>('/api/mobile/timetable', input);
}

export async function updateTimetablePeriodAction(id: string, input: PeriodInput) {
  return callMobileApi(`/api/mobile/timetable/${id}`, input, 'PATCH');
}

export async function deleteTimetablePeriodAction(id: string) {
  return callMobileApi(`/api/mobile/timetable/${id}`, {}, 'DELETE');
}
