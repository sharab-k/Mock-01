'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { computeAttendanceSummary, computeOverallAverage } from '@/lib/reports/aggregate'

const IdSchema = z.object({ studentId: z.string().uuid() })

export type StudentAcademicSummary = { attendancePct: number; avgScore: number }

// Lazy per-student aggregate for the Super Admin student directory's
// slide-over — computed on click rather than eagerly for the whole roster,
// since the list view itself doesn't need it (avoids an N+1 query fan-out
// across a few hundred students just to render a table).
export async function fetchStudentAcademicSummaryAction(
  input: z.infer<typeof IdSchema>,
): Promise<{ ok: true } & StudentAcademicSummary | { ok: false; error: string }> {
  const parsed = IdSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authorized.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') return { ok: false, error: 'Not authorized.' }

  const [attRes, marksRes] = await Promise.all([
    supabase.from('attendance_records').select('status').eq('student_id', parsed.data.studentId),
    supabase.from('marks').select('subject, exam_type, score, max_score').eq('student_id', parsed.data.studentId),
  ])

  const { attendancePct } = computeAttendanceSummary(attRes.data ?? [])
  const avgScore = computeOverallAverage(marksRes.data ?? [])

  return { ok: true, attendancePct: attendancePct ?? 0, avgScore: avgScore ?? 0 }
}
