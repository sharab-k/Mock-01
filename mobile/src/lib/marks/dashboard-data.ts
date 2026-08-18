import { supabase } from '@/lib/supabase/client';
import { GRADES, sectionsForGrade } from '@/lib/students/constants';
import { fetchStudentAverages } from './student-averages';
import { fetchSubjectStats, type SubjectStat } from './subjects-data';
import type { Tier } from './tier';

export type ClassMarksStat = { avg: number; entries: number; graded: number; total: number };
export type { SubjectStat };

export type MarksDashboardData = {
  classStats: Record<string, Record<string, ClassMarksStat>>;
  totalEnrolled: number;
  entriesThisWeek: number;
  subjectsCovered: number;
  studentsGraded: number;
  pendingEntry: number;
  tierCounts: Record<Tier, number>;
  totalTiered: number;
  subjects: SubjectStat[];
};

// Ported from the web's lib/marks/dashboard-data.ts.
export async function fetchMarksDashboardData(): Promise<MarksDashboardData> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [studentsRes, marksRes, recentRes] = await Promise.all([
    supabase.from('students').select('id, grade_level, section').is('deleted_at', null).eq('status', 'active'),
    supabase.from('marks').select('student_id, subject, score, max_score, students(grade_level, section)'),
    supabase.from('marks').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
  ]);

  const classStats: Record<string, Record<string, ClassMarksStat>> = {};
  for (const g of GRADES) {
    classStats[g] = {};
    for (const s of sectionsForGrade(g)) classStats[g][s] = { avg: 0, entries: 0, graded: 0, total: 0 };
  }
  for (const row of studentsRes.data ?? []) {
    if (classStats[row.grade_level]?.[row.section]) classStats[row.grade_level][row.section].total++;
  }

  const gradedStudentsByClass = new Map<string, Set<string>>();
  const sumByClass = new Map<string, number>();
  for (const row of marksRes.data ?? []) {
    const grade = row.students?.grade_level;
    const section = row.students?.section;
    if (!grade || !section || !classStats[grade]?.[section]) continue;
    const key = `${grade}-${section}`;
    classStats[grade][section].entries++;
    const pct = (row.score / row.max_score) * 100;
    sumByClass.set(key, (sumByClass.get(key) ?? 0) + pct);
    if (!gradedStudentsByClass.has(key)) gradedStudentsByClass.set(key, new Set());
    gradedStudentsByClass.get(key)!.add(row.student_id);
  }
  for (const g of GRADES) {
    for (const s of sectionsForGrade(g)) {
      const key = `${g}-${s}`;
      const stat = classStats[g][s];
      stat.graded = gradedStudentsByClass.get(key)?.size ?? 0;
      stat.avg = stat.entries > 0 ? Math.round((sumByClass.get(key) ?? 0) / stat.entries) : 0;
    }
  }

  const totalEnrolled = Object.values(classStats).flatMap((g) => Object.values(g)).reduce((a, c) => a + c.total, 0);

  const studentAverages = await fetchStudentAverages();
  const tierCounts: Record<Tier, number> = { Distinction: 0, Merit: 0, Pass: 0, 'Below Pass': 0 };
  for (const { tier } of studentAverages.values()) tierCounts[tier]++;
  const totalTiered = studentAverages.size;

  const subjects = await fetchSubjectStats();

  const studentsGraded = studentAverages.size;
  const pendingEntry = Math.max(totalEnrolled - studentsGraded, 0);

  return {
    classStats,
    totalEnrolled,
    entriesThisWeek: recentRes.count ?? 0,
    subjectsCovered: subjects.length,
    studentsGraded,
    pendingEntry,
    tierCounts,
    totalTiered,
    subjects,
  };
}
