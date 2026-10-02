'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { queueGradeAlerts, type GradeAlertJob } from '@/lib/notifications/send-notification'
import { currentTerm } from '@/lib/marks/term'
import { logAction } from '@/lib/audit/log'
import type { Database } from '@/types/supabase'

async function requireMarksCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const authorized = !!profile && ['marks_admin', 'super_admin'].includes(profile.role)
  return { supabase, user, authorized }
}

const EXAM_TYPE_LABEL: Record<'monthly' | 'half_yearly' | 'final', string> = {
  monthly: 'Monthly',
  half_yearly: 'Half-Yearly',
  final: 'Final',
}

type MarkEntry = { studentId: string; studentName: string; score: number }
type MarkInsert = Database['public']['Tables']['marks']['Insert']
type MarkBase = Omit<MarkInsert, 'student_id' | 'score'>

// Writes a whole class's scores in a handful of queries instead of several
// round trips per student: one bulk insert for new scores, parallel updates
// for changed ones, one bulk insert of their edit-history rows. Unchanged
// scores are skipped entirely. CLAUDE.md §4: every changed score gets its
// own append-only history row, never a silent overwrite.
async function persistMarkBatch(
  supabase: SupabaseClient<Database>,
  userId: string,
  entries: MarkEntry[],
  existing: { id: string; student_id: string; score: number }[],
  base: MarkBase,
) {
  const existingByStudent = new Map(existing.map((r) => [r.student_id, r]))
  const toInsert: MarkInsert[] = []
  const toUpdate: { row: { id: string; score: number }; entry: MarkEntry }[] = []
  const changed: MarkEntry[] = []

  for (const entry of entries) {
    const row = existingByStudent.get(entry.studentId)
    if (!row) {
      toInsert.push({ ...base, student_id: entry.studentId, score: entry.score })
      changed.push(entry)
    } else if (row.score !== entry.score) {
      toUpdate.push({ row, entry })
      changed.push(entry)
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('marks').insert(toInsert)
    if (error) return { ok: false as const, error: 'Could not save the scores. Please try again.' }
  }

  if (toUpdate.length > 0) {
    const results = await Promise.all(
      toUpdate.map(({ row, entry }) => supabase.from('marks').update({ score: entry.score }).eq('id', row.id)),
    )
    const failed = results.findIndex((r) => r.error)
    if (failed !== -1) return { ok: false as const, error: `Could not update ${toUpdate[failed].entry.studentName}'s score.` }

    const { error: historyError } = await supabase.from('marks_edit_history').insert(
      toUpdate.map(({ row, entry }) => ({ mark_id: row.id, previous_score: row.score, new_score: entry.score, edited_by: userId })),
    )
    if (historyError) return { ok: false as const, error: 'Could not log the score edits. Please try again.' }
  }

  return { ok: true as const, inserted: toInsert.length, updated: toUpdate.length, changed }
}

const BulkSaveSchema = z.object({
  subject: z.string().min(1).max(100),
  examType: z.enum(['monthly', 'half_yearly', 'final']),
  maxScore: z.number().int().min(1).max(1000),
  classLabel: z.string().optional(),
  entries: z.array(z.object({
    studentId: z.string().uuid(),
    studentName: z.string().min(1),
    score: z.number().int().min(0),
  })).min(1),
})

export async function bulkSaveMarksAction(
  input: z.infer<typeof BulkSaveSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = BulkSaveSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid marks batch.' }

  const { supabase, user, authorized } = await requireMarksCaller(supabaseOverride)
  if (!authorized || !user) return { ok: false as const, error: 'Not authorized.' }

  const { subject, examType, maxScore, entries } = parsed.data
  const term = currentTerm()

  for (const entry of entries) {
    if (entry.score > maxScore) return { ok: false as const, error: `${entry.studentName}'s score exceeds the maximum.` }
  }

  const { data: existing } = await supabase
    .from('marks')
    .select('id, student_id, score')
    .eq('subject', subject)
    .eq('exam_type', examType)
    .eq('term', term)
    .is('test_id', null)
    .in('student_id', entries.map((e) => e.studentId))

  const batch = await persistMarkBatch(supabase, user.id, entries, existing ?? [], {
    subject, exam_type: examType, max_score: maxScore, term, recorded_by: user.id,
  })
  if (!batch.ok) return batch
  const { inserted, updated } = batch

  const alerts: GradeAlertJob[] = batch.changed.map((e) => ({
    studentId: e.studentId, studentName: e.studentName, subject, examLabel: EXAM_TYPE_LABEL[examType], score: e.score, maxScore,
  }))
  const notified = await queueGradeAlerts(alerts)

  if (inserted + updated > 0) {
    const label = updated > 0 && inserted === 0 ? 'Edited marks' : 'Bulk marks upload'
    await logAction(supabase, user.id, `${label} — ${subject} ${EXAM_TYPE_LABEL[examType]} · ${parsed.data.classLabel ?? term} · ${inserted + updated} students`)
  }

  return { ok: true as const, inserted, updated, notified }
}

const BulkSaveTestMarksSchema = z.object({
  testId: z.string().uuid(),
  entries: z.array(z.object({
    studentId: z.string().uuid(),
    studentName: z.string().min(1),
    score: z.number().int().min(0),
  })).min(1),
})

// The custom-test counterpart to bulkSaveMarksAction above — same
// insert-or-update-with-history shape, same notification-on-change
// behaviour, just keyed by test_id (public.tests) instead of
// subject+examType+term. Subject name, exam label, max score, and term all
// come from the test row itself rather than being passed in, since a test
// already pins all of that down at creation time.
export async function bulkSaveTestMarksAction(
  input: z.infer<typeof BulkSaveTestMarksSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = BulkSaveTestMarksSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid marks batch.' }

  const { supabase, user, authorized } = await requireMarksCaller(supabaseOverride)
  if (!authorized || !user) return { ok: false as const, error: 'Not authorized.' }

  const { testId, entries } = parsed.data

  const { data: test } = await supabase.from('tests').select('title, max_score, grade_level, section, subjects(name)').eq('id', testId).single()
  if (!test) return { ok: false as const, error: 'Test not found.' }

  for (const entry of entries) {
    if (entry.score > test.max_score) return { ok: false as const, error: `${entry.studentName}'s score exceeds the maximum.` }
  }

  const term = currentTerm()
  const subjectName = test.subjects?.name ?? '—'

  const { data: existing } = await supabase
    .from('marks')
    .select('id, student_id, score')
    .eq('test_id', testId)
    .in('student_id', entries.map((e) => e.studentId))

  const batch = await persistMarkBatch(supabase, user.id, entries, existing ?? [], {
    subject: subjectName, exam_type: 'custom', test_id: testId, max_score: test.max_score, term, recorded_by: user.id,
  })
  if (!batch.ok) return batch
  const { inserted, updated } = batch

  const alerts: GradeAlertJob[] = batch.changed.map((e) => ({
    studentId: e.studentId, studentName: e.studentName, subject: subjectName, examLabel: test.title, score: e.score, maxScore: test.max_score,
  }))
  const notified = await queueGradeAlerts(alerts)

  if (inserted + updated > 0) {
    await logAction(supabase, user.id, `Bulk marks upload — ${subjectName} "${test.title}" · Grade ${test.grade_level}-${test.section} · ${inserted + updated} students`)
  }

  return { ok: true as const, inserted, updated, notified }
}
