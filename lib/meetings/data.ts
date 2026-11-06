import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

type Db = SupabaseClient<Database>

export type Meeting = { id: string; title: string; meeting_date: string; briefing: string | null; is_published: boolean }
export type Slot = { id: string; starts_at: string; ends_at: string; with_whom: string | null; taken: boolean }
export type Booking = { id: string; slot_id: string; student_id: string; student_name: string; student_class: string; parent_name: string | null; parent_phone: string | null; note: string | null; created_at: string }

const MEETING_COLS = 'id, title, meeting_date, briefing, is_published'

/** Meetings the caller may see (RLS: the administration sees all, everyone else only published). */
export async function fetchMeetings(supabaseOverride?: Db): Promise<(Meeting & { slotCount: number; bookedCount: number })[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data: meetings } = await supabase.from('ptm_meetings').select(MEETING_COLS).order('meeting_date', { ascending: false })
  const list = meetings ?? []
  if (list.length === 0) return []
  const ids = list.map((m) => m.id)
  const [slots, bookings] = await Promise.all([
    supabase.from('ptm_slots').select('id, meeting_id').in('meeting_id', ids),
    supabase.from('ptm_bookings').select('meeting_id').in('meeting_id', ids).is('cancelled_at', null),
  ])
  return list.map((m) => ({
    ...m,
    slotCount: (slots.data ?? []).filter((s) => s.meeting_id === m.id).length,
    bookedCount: (bookings.data ?? []).filter((b) => b.meeting_id === m.id).length,
  }))
}

/** One meeting with its slots. `taken` comes from the SQL function, so a parent learns a slot is busy but never who has it. */
export async function fetchMeetingWithSlots(id: string, supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: meeting } = await supabase.from('ptm_meetings').select(MEETING_COLS).eq('id', id).maybeSingle()
  if (!meeting) return null
  const [{ data: slots }, { data: taken }] = await Promise.all([
    supabase.from('ptm_slots').select('id, starts_at, ends_at, with_whom').eq('meeting_id', id).order('starts_at').order('with_whom'),
    supabase.rpc('ptm_taken_slots', { p_meeting: id }),
  ])
  const takenSet = new Set((taken ?? []) as unknown as string[])
  return { meeting: meeting as Meeting, slots: (slots ?? []).map((s): Slot => ({ ...s, taken: takenSet.has(s.id) })) }
}

/** The administration's booking list for a meeting. Parent names come from the service role, after RLS let the caller read the bookings. */
export async function fetchMeetingBookings(meetingId: string, supabaseOverride?: Db): Promise<Booking[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase
    .from('ptm_bookings')
    .select('id, slot_id, student_id, parent_id, note, created_at, students(full_name, grade_level, section)')
    .eq('meeting_id', meetingId).is('cancelled_at', null)
  const rows = data ?? []
  const parentIds = Array.from(new Set(rows.map((r) => r.parent_id).filter((p): p is string => !!p)))
  const { data: people } = parentIds.length ? await createAdminClient().from('profiles').select('id, full_name, phone').in('id', parentIds) : { data: [] }
  const byId = new Map((people ?? []).map((p) => [p.id, p]))
  return rows.map((r) => {
    const s = r.students as unknown as { full_name: string; grade_level: string; section: string } | null
    const p = r.parent_id ? byId.get(r.parent_id) : undefined
    return {
      id: r.id, slot_id: r.slot_id, student_id: r.student_id, student_name: s?.full_name ?? '—', student_class: s ? `${s.grade_level}${s.section}` : '',
      parent_name: p?.full_name ?? null, parent_phone: p?.phone ?? null, note: r.note, created_at: r.created_at,
    }
  })
}

/** A parent's own bookings (RLS limits this to parent_id = them). */
export async function fetchMyBookings(supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.from('ptm_bookings').select('id, slot_id, meeting_id, student_id').is('cancelled_at', null)
  return data ?? []
}

export const PKT = 'Asia/Karachi'
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: PKT })
export const dateLabel = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
