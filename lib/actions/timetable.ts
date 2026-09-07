'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import { GRADES } from '@/lib/students/constants'
import { WEEKDAYS, WEEKDAY_LABEL, type Weekday } from '@/lib/timetable/constants'
import type { Database } from '@/types/supabase'

async function requireSuperAdminCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

export type TimetablePeriod = {
  id: string
  gradeLevel: string
  section: string
  dayOfWeek: Weekday
  startTime: string
  endTime: string
  subject: string
  teacherId: string | null
  teacherName: string | null
}

// One class's full week at once — the timetable screen renders every day's
// column from this single call rather than one request per day.
export async function fetchClassTimetable(
  gradeLevel: string,
  section: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<TimetablePeriod[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase
    .from('class_timetable_periods')
    .select('id, grade_level, section, day_of_week, start_time, end_time, subject, teacher_id, teachers(full_name)')
    .eq('grade_level', gradeLevel)
    .eq('section', section)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  return (data ?? []).map((p) => ({
    id: p.id,
    gradeLevel: p.grade_level,
    section: p.section,
    dayOfWeek: p.day_of_week,
    startTime: p.start_time,
    endTime: p.end_time,
    subject: p.subject,
    teacherId: p.teacher_id,
    teacherName: p.teachers?.full_name ?? null,
  }))
}

const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour).')

const PeriodInputSchema = z.object({
  gradeLevel: z.enum(GRADES as [string, ...string[]]),
  section: z.string().min(1).max(10),
  dayOfWeek: z.enum(WEEKDAYS),
  startTime: TimeSchema,
  endTime: TimeSchema,
  subject: z.string().min(1).max(100),
  teacherId: z.string().uuid().optional().or(z.literal('')),
}).refine((d) => d.endTime > d.startTime, { message: 'End time must be after start time.', path: ['endTime'] })

export async function createTimetablePeriodAction(
  input: z.infer<typeof PeriodInputSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = PeriodInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid period details.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { gradeLevel, section, dayOfWeek, startTime, endTime, subject, teacherId } = parsed.data
  const { data, error } = await supabase
    .from('class_timetable_periods')
    .insert({
      grade_level: gradeLevel, section, day_of_week: dayOfWeek,
      start_time: startTime, end_time: endTime, subject,
      teacher_id: teacherId || null, created_by: userId,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: 'Could not add the period. Please try again.' }

  await logAction(supabase, userId, `Added timetable period — ${subject} · Grade ${gradeLevel}-${section} · ${WEEKDAY_LABEL[dayOfWeek]} ${startTime}–${endTime}`)
  return { ok: true, id: data.id }
}

const UpdatePeriodSchema = PeriodInputSchema.and(z.object({ id: z.string().uuid() }))

export async function updateTimetablePeriodAction(
  input: z.infer<typeof UpdatePeriodSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = UpdatePeriodSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid period details.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { id, gradeLevel, section, dayOfWeek, startTime, endTime, subject, teacherId } = parsed.data
  const { error } = await supabase
    .from('class_timetable_periods')
    .update({
      grade_level: gradeLevel, section, day_of_week: dayOfWeek,
      start_time: startTime, end_time: endTime, subject, teacher_id: teacherId || null,
    })
    .eq('id', id)

  if (error) return { ok: false, error: 'Could not update the period. Please try again.' }

  await logAction(supabase, userId, `Edited timetable period — ${subject} · Grade ${gradeLevel}-${section} · ${WEEKDAY_LABEL[dayOfWeek]} ${startTime}–${endTime}`)
  return { ok: true }
}

const IdSchema = z.object({ id: z.string().uuid() })

export async function deleteTimetablePeriodAction(
  input: z.infer<typeof IdSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = IdSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { data, error } = await supabase
    .from('class_timetable_periods')
    .delete()
    .eq('id', parsed.data.id)
    .select('subject, grade_level, section')
    .single()

  if (error) return { ok: false, error: 'Could not remove the period. Please try again.' }

  await logAction(supabase, userId, `Removed timetable period — ${data.subject} · Grade ${data.grade_level}-${data.section}`)
  return { ok: true }
}
