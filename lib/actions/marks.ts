'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLinkedParentPhones, sendGradeAlert } from '@/lib/notifications/send-notification'
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

  let inserted = 0
  let updated = 0
  let notified = 0

  for (const entry of entries) {
    const { data: existing } = await supabase
      .from('marks')
      .select('id, score')
      .eq('student_id', entry.studentId)
      .eq('subject', subject)
      .eq('exam_type', examType)
      .eq('term', term)
      .maybeSingle()

    let shouldNotify = false

    if (!existing) {
      const { error } = await supabase.from('marks').insert({
        student_id: entry.studentId,
        subject,
        exam_type: examType,
        score: entry.score,
        max_score: maxScore,
        term,
        recorded_by: user.id,
      })
      if (error) return { ok: false as const, error: `Could not save ${entry.studentName}'s score.` }
      inserted++
      shouldNotify = true
    } else if (existing.score !== entry.score) {
      const { error: updateError } = await supabase
        .from('marks')
        .update({ score: entry.score })
        .eq('id', existing.id)
      if (updateError) return { ok: false as const, error: `Could not update ${entry.studentName}'s score.` }

      // CLAUDE.md §4: edits are "logged, never silently overwritten" — every
      // changed score gets its own append-only history row.
      const { error: historyError } = await supabase.from('marks_edit_history').insert({
        mark_id: existing.id,
        previous_score: existing.score,
        new_score: entry.score,
        edited_by: user.id,
      })
      if (historyError) return { ok: false as const, error: `Could not log the edit for ${entry.studentName}.` }
      updated++
      shouldNotify = true
    }

    if (shouldNotify) {
      const phones = await getLinkedParentPhones(entry.studentId)
      await Promise.all(phones.map((phone) =>
        sendGradeAlert(entry.studentName, phone, subject, EXAM_TYPE_LABEL[examType], entry.score, maxScore),
      ))
      if (phones.length > 0) notified++
    }
  }

  if (inserted + updated > 0) {
    const label = updated > 0 && inserted === 0 ? 'Edited marks' : 'Bulk marks upload'
    await logAction(supabase, user.id, `${label} — ${subject} ${EXAM_TYPE_LABEL[examType]} · ${parsed.data.classLabel ?? term} · ${inserted + updated} students`)
  }

  return { ok: true as const, inserted, updated, notified }
}
