import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/db/fetch-all'
import { GRADES, sectionsForGrade } from '@/lib/students/constants'
import { fetchStudentAverages } from './student-averages'
import { fetchSubjectStats, type SubjectStat } from './subjects-data'
import type { Tier } from './tier'

export type ClassMarksStat = { avg: number; entries: number; graded: number; total: number }
export type { SubjectStat }

export type MarksDashboardData = {
  classStats: Record<string, Record<string, ClassMarksStat>>
  totalEnrolled: number
  entriesThisWeek: number
  subjectsCovered: number
  studentsGraded: number
  pendingEntry: number
  tierCounts: Record<Tier, number>
  totalTiered: number
  subjects: SubjectStat[]
}

// Every figure here is added up by the database (marks_class_stats,
// marks_student_averages, marks_subject_stats) rather than by downloading the
// marks table — which was both slow and silently wrong past 1,000 rows. The
// four independent reads run together.
export async function fetchMarksDashboardData(): Promise<MarksDashboardData> {
  const supabase = await createClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [students, classRes, recentRes, studentAverages, subjects] = await Promise.all([
    fetchAllRows((from, to) => supabase.from('students').select('id, grade_level, section').is('deleted_at', null).eq('status', 'active').order('id').range(from, to)),
    supabase.rpc('marks_class_stats'),
    supabase.from('marks').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    fetchStudentAverages(),
    fetchSubjectStats(),
  ])

  const classStats: Record<string, Record<string, ClassMarksStat>> = {}
  for (const g of GRADES) {
    classStats[g] = {}
    for (const s of sectionsForGrade(g)) classStats[g][s] = { avg: 0, entries: 0, graded: 0, total: 0 }
  }
  for (const row of students) {
    if (classStats[row.grade_level]?.[row.section]) classStats[row.grade_level][row.section].total++
  }
  for (const row of classRes.data ?? []) {
    const stat = classStats[row.grade_level]?.[row.section]
    if (!stat) continue
    stat.entries = Number(row.entries)
    stat.graded = Number(row.graded)
    stat.avg = stat.entries > 0 ? Math.round(Number(row.avg_pct)) : 0
  }

  const totalEnrolled = Object.values(classStats).flatMap((g) => Object.values(g)).reduce((a, c) => a + c.total, 0)

  const tierCounts: Record<Tier, number> = { Distinction: 0, Merit: 0, Pass: 0, 'Below Pass': 0 }
  for (const { tier } of studentAverages.values()) tierCounts[tier]++
  const totalTiered = studentAverages.size

  const studentsGraded = studentAverages.size
  const pendingEntry = Math.max(totalEnrolled - studentsGraded, 0)

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
  }
}
