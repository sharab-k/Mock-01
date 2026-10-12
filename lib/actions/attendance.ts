'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLinkedParentsBatch } from '@/lib/notifications/send-notification'
import { logAction } from '@/lib/audit/log'
import type { Database } from '@/types/supabase'

async function requireAttendanceCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const authorized = !!profile && ['attendance_admin', 'super_admin'].includes(profile.role)
  return { supabase, user, authorized }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const AttendanceStatusSchema = z.enum(['present', 'absent', 'late'])

const MarkOneSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1),
  status: AttendanceStatusSchema,
  // Back-dated marking is allowed; a day that hasn't happened yet is not.
  classDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => d <= today(), 'Date cannot be in the future.').optional(),
})

// Shared core: upserts one attendance row and fires the absence pipeline only
// when this is a genuine first-time mark for the day (an INSERT), never on a
// same-day correction (an UPDATE) — CLAUDE.md §7's "not on every update" rule.
// The absence notification is a database event, so it can never roll back or
// delay the attendance write.
async function markOneAttendance(
  supabase: SupabaseClient<Database>,
  markedBy: string,
  input: z.infer<typeof MarkOneSchema>,
): Promise<{ ok: true; notified: boolean } | { ok: false; error: string }> {
  const classDate = input.classDate ?? today()

  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id, status')
    .eq('student_id', input.studentId)
    .eq('class_date', classDate)
    .maybeSingle()

  // Fires whenever a mark newly becomes 'absent' for the day — a fresh
  // insert, or a correction from present/late — but never re-fires on a
  // second click that leaves the student absent (CLAUDE.md §7's "not on
  // every update" is about not spamming re-marks, not about missing every
  // absence that wasn't the very first write of the day).
  const becameAbsent = input.status === 'absent' && existing?.status !== 'absent'

  const { error } = await supabase
    .from('attendance_records')
    .upsert(
      { student_id: input.studentId, class_date: classDate, status: input.status, marked_by: markedBy },
      { onConflict: 'student_id,class_date' },
    )

  if (error) return { ok: false, error: 'Could not save attendance.' }

  // The parent notification itself is raised by the database (trigger
  // notify_parents_on_absence on attendance_records) the moment this row becomes
  // 'absent' — nothing to send from here. We only report whether there was a
  // parent account to receive it, for the UI's "Notified" state.
  let notified = false
  if (becameAbsent) {
    const parents = await getLinkedParentsBatch([input.studentId])
    notified = (parents.get(input.studentId)?.length ?? 0) > 0
  }

  return { ok: true, notified }
}

export async function markAttendanceAction(
  input: z.infer<typeof MarkOneSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = MarkOneSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid attendance details.' }

  const { supabase, user, authorized } = await requireAttendanceCaller(supabaseOverride)
  if (!authorized || !user) return { ok: false as const, error: 'Not authorized.' }

  const result = await markOneAttendance(supabase, user.id, parsed.data)
  if (result.ok) {
    await logAction(supabase, user.id, `Marked attendance — ${parsed.data.studentName} · ${parsed.data.status}`)
  }
  return result
}

const SubmitClassSchema = z.object({
  classDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => d <= today(), 'Date cannot be in the future.').optional(),
  classLabel: z.string().optional(),
  records: z.array(z.object({
    studentId: z.string().uuid(),
    studentName: z.string().min(1),
    status: AttendanceStatusSchema,
  })).min(1),
})

export async function submitClassAttendanceAction(
  input: z.infer<typeof SubmitClassSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = SubmitClassSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid attendance batch.' }

  const { supabase, user, authorized } = await requireAttendanceCaller(supabaseOverride)
  if (!authorized || !user) return { ok: false as const, error: 'Not authorized.' }

  const classDate = parsed.data.classDate ?? today()
  let notifiedCount = 0

  for (const record of parsed.data.records) {
    const result = await markOneAttendance(supabase, user.id, { ...record, classDate })
    if (result.ok && result.notified) notifiedCount++
  }

  await logAction(supabase, user.id, `Marked attendance — ${parsed.data.classLabel ?? 'roster'} · ${classDate} · ${parsed.data.records.length} students`)

  return { ok: true as const, notifiedCount }
}
