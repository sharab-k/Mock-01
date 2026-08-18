import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { tierOf, type Tier } from '@/lib/marks/tier';
import { letterGrade } from '@/lib/marks/letter-grade';

const EXAM_LABEL: Record<string, string> = { monthly: 'Monthly', half_yearly: 'Half-Yearly', final: 'Final' };

export type AttStatus = 'Present' | 'Late' | 'Absent';

export type ChildAcademicData = {
  gradeVal: string;
  tier: Tier | null;
  attendancePct: number;
  avgScore: number;
  marks: { subject: string; exam: string; score: number; max: number; grade: string }[];
  attendance: { day: string; date: string; status: AttStatus }[];
  monthlyTrend: { month: string; attendance: number; avgScore: number }[];
};

export function monthBuckets(n: number): { label: string; start: Date; end: Date }[] {
  return Array.from({ length: n }, (_, i) => {
    const offset = n - 1 - i;
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCMonth(start.getUTCMonth() - offset);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { label: start.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }), start, end };
  });
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

// Ported 1:1 from the web's lib/parent/child-academic-data.ts — same query,
// same computation, so the mobile app's numbers can never quietly disagree
// with the web dashboard for the same student. Runs on the caller's own
// RLS-scoped client (the mobile app's bearer-authenticated Supabase client,
// same parent_read_linked_children_* policies as the web's cookie client).
export async function fetchChildAcademicData(supabase: SupabaseClient<Database>, studentId: string): Promise<ChildAcademicData> {
  const [attendanceRes, marksRes] = await Promise.all([
    supabase.from('attendance_records').select('class_date, status').eq('student_id', studentId).order('class_date', { ascending: false }),
    supabase.from('marks').select('subject, exam_type, score, max_score, created_at').eq('student_id', studentId).order('created_at', { ascending: false }),
  ]);

  const attRows = attendanceRes.data ?? [];
  const attended = attRows.filter((r) => r.status === 'present' || r.status === 'late').length;
  const attendancePct = attRows.length > 0 ? Math.round((attended / attRows.length) * 100) : 0;

  const attendance = attRows.slice(0, 5).reverse().map((r) => ({
    day: new Date(`${r.class_date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
    date: new Date(`${r.class_date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    status: (r.status === 'present' ? 'Present' : r.status === 'late' ? 'Late' : 'Absent') as AttStatus,
  }));

  const markRows = marksRes.data ?? [];
  const avgScore = markRows.length > 0 ? Math.round(markRows.reduce((a, m) => a + (m.score / m.max_score) * 100, 0) / markRows.length) : 0;
  const marks = markRows.map((m) => ({
    subject: m.subject,
    exam: EXAM_LABEL[m.exam_type] ?? m.exam_type,
    score: m.score,
    max: m.max_score,
    grade: letterGrade(m.score, m.max_score),
  }));

  const buckets = monthBuckets(5);
  const monthlyTrend = buckets.map((b) => {
    const attInMonth = attRows.filter((r) => inRange(`${r.class_date}T00:00:00Z`, b.start, b.end));
    const attendedInMonth = attInMonth.filter((r) => r.status === 'present' || r.status === 'late').length;
    const attendance = attInMonth.length > 0 ? Math.round((attendedInMonth / attInMonth.length) * 100) : 0;

    const marksInMonth = markRows.filter((m) => inRange(m.created_at, b.start, b.end));
    const avgScoreInMonth = marksInMonth.length > 0
      ? Math.round(marksInMonth.reduce((a, m) => a + (m.score / m.max_score) * 100, 0) / marksInMonth.length)
      : 0;

    return { month: b.label, attendance, avgScore: avgScoreInMonth };
  });

  return {
    gradeVal: markRows.length > 0 ? letterGrade(avgScore, 100) : '—',
    tier: markRows.length > 0 ? tierOf(avgScore) : null,
    attendancePct,
    avgScore,
    marks,
    attendance,
    monthlyTrend,
  };
}
