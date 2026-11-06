'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import { COMPLAINT_LABEL, COMPLAINT_STATUSES } from '@/lib/complaints/constants'
import type { Database } from '@/types/supabase'

type Db = SupabaseClient<Database>

async function caller(supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, role: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, role: profile?.role ?? null }
}

const SubmitSchema = z.object({
  studentId: z.string().uuid(),
  subject: z.string().trim().min(1, 'Add a short subject').max(120),
  details: z.string().trim().min(5, 'Describe the complaint').max(2000),
})

// A parent files a complaint for one of their own children. The database also enforces
// this (policy: own linked child, starts Pending, no action or response filled in).
export async function submitComplaintAction(input: z.infer<typeof SubmitSchema>, supabaseOverride?: Db) {
  const parsed = SubmitSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }

  const { supabase, userId, role } = await caller(supabaseOverride)
  if (!userId || role !== 'parent') return { ok: false as const, error: 'Only a parent can file a complaint.' }

  const { data, error } = await supabase.from('complaints').insert({
    student_id: parsed.data.studentId, parent_id: userId, subject: parsed.data.subject, details: parsed.data.details,
  }).select('complaint_no').single()
  if (error || !data) return { ok: false as const, error: 'Could not submit the complaint. Check the child is linked to your account.' }

  await logAction(supabase, userId, `Filed complaint #${data.complaint_no} — ${parsed.data.subject}`)
  return { ok: true as const, complaintNo: data.complaint_no }
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(COMPLAINT_STATUSES),
  actionTaken: z.string().trim().max(2000).optional(),
  response: z.string().trim().max(2000).optional(),
  actionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).refine((v) => v.status !== 'resolved' || (v.response && v.response.length > 0), { message: 'Write a response before resolving', path: ['response'] })

// The administration (Super Admin / Admissions Admin) records the action, the response, the
// date and the status. The history row is written by a database trigger.
export async function updateComplaintAction(input: z.infer<typeof UpdateSchema>, supabaseOverride?: Db) {
  const parsed = UpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  const u = parsed.data

  const { supabase, userId, role } = await caller(supabaseOverride)
  if (!userId || (role !== 'super_admin' && role !== 'admissions_admin')) return { ok: false as const, error: 'Not authorized.' }

  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase.from('complaints').update({
    status: u.status, action_taken: u.actionTaken || null, response: u.response || null,
    action_date: u.actionDate || (u.actionTaken || u.response ? today : null),
  }).eq('id', u.id).select('complaint_no').maybeSingle()
  if (error || !data) return { ok: false as const, error: 'Could not update the complaint.' }

  await logAction(supabase, userId, `Updated complaint #${data.complaint_no} — ${COMPLAINT_LABEL[u.status]}`)
  return { ok: true as const }
}
