'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLinkedParentPhones, sendAbsenceAlert } from '@/lib/notifications/send-notification'
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
  classDate: z.string().optional(),
})

// Shared core: upserts one attendance row and fires the absence pipeline only
// when this is a genuine first-time mark for the day (an INSERT), never on a
// same-day correction (an UPDATE) — CLAUDE.md §7's "not on every update" rule.
// A Twilio failure inside sendAbsenceAlert never throws, so it can never roll
// back the attendance write that already committed above it.
async function markOneAttendance(
  supabase: SupabaseClient<Database>,
  markedBy: string,
  input: z.infer<typeof MarkOneSchema>,
): Promise<{ ok: true; notified: boolean } | { ok: false; error: string }> {
  const classDate = input.classDate ?? today()

  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('student_id', input.studentId)
    .eq('class_date', classDate)
    .maybeSingle()

  const isNewRecord = !existing

  const { error } = await supabase
    .from('attendance_records')
    .upsert(
      { student_id: input.studentId, class_date: classDate, status: input.status, marked_by: markedBy },
      { onConflict: 'student_id,class_date' },
    )

  if (error) return { ok: false, error: 'Could not save attendance.' }

  let notified = false
  if (isNewRecord && input.status === 'absent') {
    const phones = await getLinkedParentPhones(input.studentId)
    await Promise.all(phones.map((phone) => sendAbsenceAlert(input.studentName, phone, classDate)))
    notified = phones.length > 0
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
  classDate: z.string().optional(),
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
