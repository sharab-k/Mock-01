import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { logAction } from '@/lib/audit/log'
import { queueGradeAlerts, type GradeAlertJob } from '@/lib/notifications/send-notification'
import { termForDate } from '@/lib/marks/term'
import { EXAM_LABEL, type ExamType } from '@/lib/marks/upload-types'

export type BulkMarkRow = { studentId: string; studentName: string; subject: string; examDate: string; score: number; maxScore: number }

const CHUNK = 500

type ChangedRow = { student_id: string; subject: string; score: number; max_score: number }

// Saves a whole batch of marks (a spreadsheet upload) with ONE database call per
// 500 marks (public.bulk_upsert_marks): new marks are inserted, changed scores
// updated with their edit-history row, unchanged ones left alone. Replaces the
// old per-(subject, date) loop that cost ~2 s per group on the live site and
// could run past the request limit with a half-saved file.
//
// Runs as the caller (RLS applies). The caller has already been authorised as
// marks_admin / super_admin and must not pass the same (student, subject, date)
// twice.
export async function saveMarksBatch(
  supabase: SupabaseClient<Database>,
  userId: string,
  examType: ExamType,
  rows: BulkMarkRow[],
  options: { notify: boolean; label: string },
): Promise<{ ok: true; inserted: number; updated: number; notified: number } | { ok: false; error: string; inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0
  const nameById = new Map(rows.map((r) => [r.studentId, r.studentName]))
  const alerts: GradeAlertJob[] = []

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { data, error } = await supabase.rpc('bulk_upsert_marks', {
      p_rows: chunk.map((r) => ({
        student_id: r.studentId,
        subject: r.subject,
        exam_type: examType,
        term: termForDate(r.examDate),
        exam_date: r.examDate,
        score: r.score,
        max_score: r.maxScore,
      })),
    })
    const result = data?.[0]
    if (error || !result) {
      return { ok: false, error: `Could not save marks ${i + 1}–${i + chunk.length}. Everything before that was saved; upload again to continue.`, inserted, updated }
    }
    inserted += result.inserted
    updated += result.updated
    for (const c of (result.changed ?? []) as ChangedRow[]) {
      alerts.push({
        studentId: c.student_id,
        studentName: nameById.get(c.student_id) ?? '—',
        subject: c.subject,
        examLabel: EXAM_LABEL[examType],
        score: c.score,
        maxScore: c.max_score,
      })
    }
  }

  const notified = options.notify && alerts.length > 0 ? await queueGradeAlerts(alerts, userId) : 0

  if (inserted + updated > 0) {
    await logAction(supabase, userId, `Bulk marks upload — ${EXAM_LABEL[examType]} · ${options.label} · ${inserted + updated} marks (${inserted} new, ${updated} updated)`)
  }
  return { ok: true, inserted, updated, notified }
}
