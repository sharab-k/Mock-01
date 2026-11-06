'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import type { Database } from '@/types/supabase'

type Db = SupabaseClient<Database>

async function caller(supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, role: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, role: profile?.role ?? null }
}
const isAdmin = (role: string | null) => role === 'super_admin' || role === 'admissions_admin'
const NO = { ok: false as const, error: 'Not authorized.' }
const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

const MeetingSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1, 'A title is required').max(120),
  meetingDate: isoDate,
  briefing: z.string().trim().max(4000).nullable().optional(),
  isPublished: z.boolean(),
})

export async function saveMeetingAction(input: z.infer<typeof MeetingSchema>, supabaseOverride?: Db) {
  const parsed = MeetingSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  const m = parsed.data
  const { supabase, userId, role } = await caller(supabaseOverride)
  if (!userId || !isAdmin(role)) return NO

  const row = { title: m.title, meeting_date: m.meetingDate, briefing: m.briefing || null, is_published: m.isPublished }
  if (m.id) {
    const { error } = await supabase.from('ptm_meetings').update(row).eq('id', m.id)
    if (error) return { ok: false as const, error: 'Could not save the meeting.' }
    await logAction(supabase, userId, `Edited parents meeting — ${m.title}`)
    return { ok: true as const, id: m.id }
  }
  const { data, error } = await supabase.from('ptm_meetings').insert({ ...row, created_by: userId }).select('id').single()
  if (error || !data) return { ok: false as const, error: 'Could not create the meeting.' }
  await logAction(supabase, userId, `Created parents meeting — ${m.title}`)
  return { ok: true as const, id: data.id }
}

export async function deleteMeetingAction(input: { id: string }, supabaseOverride?: Db) {
  const parsed = z.object({ id: uuid }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }
  const { supabase, userId, role } = await caller(supabaseOverride)
  if (!userId || !isAdmin(role)) return NO
  const { data: m } = await supabase.from('ptm_meetings').select('title').eq('id', parsed.data.id).maybeSingle()
  const { error } = await supabase.from('ptm_meetings').delete().eq('id', parsed.data.id)
  if (error) return { ok: false as const, error: 'Could not delete the meeting.' }
  await logAction(supabase, userId, `Deleted parents meeting — ${m?.title ?? parsed.data.id}`)
  return { ok: true as const }
}

const SlotsSchema = z.object({
  meetingId: uuid,
  date: isoDate,
  start: hhmm,
  end: hhmm,
  minutes: z.number().int().min(5).max(120),
  withWhom: z.string().trim().max(80).optional(),
}).refine((v) => v.end > v.start, { message: 'The end time must be after the start time', path: ['end'] })

const MAX_SLOTS = 200

// Cuts [start, end) into equal slots. Times are Pakistan time (UTC+5, no daylight saving).
export async function addSlotsAction(input: z.infer<typeof SlotsSchema>, supabaseOverride?: Db) {
  const parsed = SlotsSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  const s = parsed.data
  const { supabase, userId, role } = await caller(supabaseOverride)
  if (!userId || !isAdmin(role)) return NO

  const at = (hm: string) => new Date(`${s.date}T${hm}:00+05:00`).getTime()
  const rows: { meeting_id: string; starts_at: string; ends_at: string; with_whom: string | null }[] = []
  for (let t = at(s.start); t + s.minutes * 60_000 <= at(s.end); t += s.minutes * 60_000) {
    rows.push({ meeting_id: s.meetingId, starts_at: new Date(t).toISOString(), ends_at: new Date(t + s.minutes * 60_000).toISOString(), with_whom: s.withWhom || null })
    if (rows.length > MAX_SLOTS) return { ok: false as const, error: `That would make more than ${MAX_SLOTS} slots.` }
  }
  if (rows.length === 0) return { ok: false as const, error: 'The time range is shorter than one slot.' }

  const { error } = await supabase.from('ptm_slots').insert(rows)
  if (error) return { ok: false as const, error: 'Could not add the slots.' }
  await logAction(supabase, userId, `Added ${rows.length} meeting slots`)
  return { ok: true as const, created: rows.length }
}

export async function deleteSlotAction(input: { id: string }, supabaseOverride?: Db) {
  const parsed = z.object({ id: uuid }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }
  const { supabase, userId, role } = await caller(supabaseOverride)
  if (!userId || !isAdmin(role)) return NO
  const { error } = await supabase.from('ptm_slots').delete().eq('id', parsed.data.id)
  if (error) return { ok: false as const, error: 'Could not remove the slot.' }
  return { ok: true as const }
}

const BookSchema = z.object({ slotId: uuid, studentId: uuid, note: z.string().trim().max(500).optional() })

// A parent books one slot for one of their own children. The database guarantees the slot and
// the child can each be booked once, so two parents racing for the same slot cannot both win.
export async function bookSlotAction(input: z.infer<typeof BookSchema>, supabaseOverride?: Db) {
  const parsed = BookSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }
  const { supabase, userId, role } = await caller(supabaseOverride)
  if (!userId || role !== 'parent') return { ok: false as const, error: 'Only a parent can book a slot.' }

  const { error } = await supabase.from('ptm_bookings').insert({ slot_id: parsed.data.slotId, student_id: parsed.data.studentId, parent_id: userId, note: parsed.data.note || null, meeting_id: '00000000-0000-0000-0000-000000000000' })
  if (error) {
    if (error.code === '23505') {
      return { ok: false as const, error: error.message.includes('uq_ptm_bookings_student') ? 'This child already has a slot in this meeting. Cancel it first to pick another.' : 'Sorry, that slot has just been taken. Please pick another.' }
    }
    return { ok: false as const, error: 'Could not book the slot.' }
  }
  await logAction(supabase, userId, 'Booked a parents meeting slot')
  return { ok: true as const }
}

// A parent (own booking) or the administration (any) cancels; the row is kept with cancelled_at.
export async function cancelBookingAction(input: { id: string }, supabaseOverride?: Db) {
  const parsed = z.object({ id: uuid }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }
  const { supabase, userId } = await caller(supabaseOverride)
  if (!userId) return NO
  const { data, error } = await supabase.from('ptm_bookings').update({ cancelled_at: new Date().toISOString() }).eq('id', parsed.data.id).is('cancelled_at', null).select('id').maybeSingle()
  if (error || !data) return { ok: false as const, error: 'Could not cancel the booking.' }
  await logAction(supabase, userId, 'Cancelled a parents meeting booking')
  return { ok: true as const }
}
