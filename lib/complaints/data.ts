import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'
import { COMPLAINT_LIST_LIMIT, isComplaintStatus, type ComplaintStatus } from './constants'

type Db = SupabaseClient<Database>

export type ComplaintRow = {
  id: string
  complaint_no: number
  student_id: string
  student_name: string
  student_class: string
  subject: string
  details: string
  status: ComplaintStatus
  action_taken: string | null
  response: string | null
  action_date: string | null
  submitted_at: string
  parent_name: string | null
  parent_phone: string | null
}

export type ComplaintEvent = { id: string; status: ComplaintStatus; action_taken: string | null; response: string | null; action_date: string | null; created_at: string; actor_name: string | null }

const COLS = 'id, complaint_no, student_id, parent_id, subject, details, status, action_taken, response, action_date, submitted_at, students(full_name, grade_level, section)'

type Raw = Database['public']['Tables']['complaints']['Row'] & { students: { full_name: string; grade_level: string; section: string } | null }

function toRow(r: Raw, parents: Map<string, { name: string | null; phone: string | null }>): ComplaintRow {
  const p = r.parent_id ? parents.get(r.parent_id) : undefined
  return {
    id: r.id, complaint_no: r.complaint_no, student_id: r.student_id,
    student_name: r.students?.full_name ?? '—', student_class: r.students ? `${r.students.grade_level}${r.students.section}` : '',
    subject: r.subject, details: r.details, status: isComplaintStatus(r.status) ? r.status : 'pending',
    action_taken: r.action_taken, response: r.response, action_date: r.action_date, submitted_at: r.submitted_at,
    parent_name: p?.name ?? null, parent_phone: p?.phone ?? null,
  }
}

// Staff cannot read another user's profile through RLS (profiles has no such policy), so the
// parent's name and phone come from the service role — only after RLS has already let this
// caller read the complaints themselves (i.e. they are the administration).
async function parentsFor(ids: (string | null)[]) {
  const unique = Array.from(new Set(ids.filter((i): i is string => !!i)))
  if (unique.length === 0) return new Map<string, { name: string | null; phone: string | null }>()
  const { data } = await createAdminClient().from('profiles').select('id, full_name, phone').in('id', unique)
  return new Map((data ?? []).map((p) => [p.id, { name: p.full_name, phone: p.phone }]))
}

export type ComplaintFilters = { status?: ComplaintStatus | null; from?: string; to?: string; q?: string }

/** The administration's list (RLS: Super Admin / Admissions Admin see all). */
export async function fetchComplaints(f: ComplaintFilters, supabaseOverride?: Db): Promise<ComplaintRow[]> {
  const supabase = supabaseOverride ?? await createClient()
  let query = supabase.from('complaints').select(COLS).order('submitted_at', { ascending: false }).limit(COMPLAINT_LIST_LIMIT)
  if (f.status) query = query.eq('status', f.status)
  if (f.from) query = query.gte('submitted_at', `${f.from}T00:00:00Z`)
  if (f.to) query = query.lte('submitted_at', `${f.to}T23:59:59Z`)
  const { data } = await query
  const raw = (data ?? []) as unknown as Raw[]
  const parents = await parentsFor(raw.map((r) => r.parent_id))
  const rows = raw.map((r) => toRow(r, parents))
  const q = f.q?.trim().toLowerCase()
  return q ? rows.filter((r) => r.student_name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || String(r.complaint_no) === q || (r.parent_name ?? '').toLowerCase().includes(q)) : rows
}

/** A parent's own complaints (RLS limits this to parent_id = them). */
export async function fetchMyComplaints(supabaseOverride?: Db): Promise<ComplaintRow[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.from('complaints').select(COLS).order('submitted_at', { ascending: false })
  return ((data ?? []) as unknown as Raw[]).map((r) => toRow(r, new Map()))
}

export async function fetchComplaintDetail(id: string, supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.from('complaints').select(COLS).eq('id', id).maybeSingle()
  if (!data) return null
  const raw = data as unknown as Raw
  const { data: events } = await supabase.from('complaint_history').select('id, status, action_taken, response, action_date, created_at, actor_id').eq('complaint_id', id).order('created_at', { ascending: true })
  const actorIds = (events ?? []).map((e) => e.actor_id)
  const people = await parentsFor([raw.parent_id, ...actorIds])
  const history: ComplaintEvent[] = (events ?? []).map((e) => ({
    id: e.id, status: isComplaintStatus(e.status) ? e.status : 'pending', action_taken: e.action_taken, response: e.response,
    action_date: e.action_date, created_at: e.created_at, actor_name: e.actor_id ? (people.get(e.actor_id)?.name ?? null) : null,
  }))
  return { complaint: toRow(raw, people), history }
}
