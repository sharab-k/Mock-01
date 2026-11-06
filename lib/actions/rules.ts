'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAction } from '@/lib/audit/log'
import { RULES_BUCKET } from '@/lib/rules/constants'
import type { Database } from '@/types/supabase'

type Db = SupabaseClient<Database>

async function adminCaller(supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, ok: false as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, ok: profile?.role === 'super_admin' || profile?.role === 'admissions_admin' }
}

const NO = { ok: false as const, error: 'Not authorized.' }
const id = z.string().uuid()

const EditSchema = z.object({
  id,
  title: z.string().trim().min(1, 'A title is required').max(120),
  description: z.string().trim().max(2000).nullable().optional(),
})

export async function updateRuleAction(input: z.infer<typeof EditSchema>, supabaseOverride?: Db) {
  const parsed = EditSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  const { supabase, userId, ok } = await adminCaller(supabaseOverride)
  if (!ok || !userId) return NO

  const { error } = await supabase.from('rule_documents').update({ title: parsed.data.title, description: parsed.data.description || null }).eq('id', parsed.data.id)
  if (error) return { ok: false as const, error: 'Could not save the changes.' }
  await logAction(supabase, userId, `Edited rules picture — ${parsed.data.title}`)
  return { ok: true as const }
}

const PublishSchema = z.object({ ids: z.array(id).min(1).max(100), published: z.boolean() })

// Publish or unpublish one or many pictures. Parents see the change straight away.
export async function setRulesPublishedAction(input: z.infer<typeof PublishSchema>, supabaseOverride?: Db) {
  const parsed = PublishSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }
  const { supabase, userId, ok } = await adminCaller(supabaseOverride)
  if (!ok || !userId) return NO

  const { error } = await supabase.from('rule_documents').update({ is_published: parsed.data.published }).in('id', parsed.data.ids)
  if (error) return { ok: false as const, error: 'Could not update the pictures.' }
  await logAction(supabase, userId, `${parsed.data.published ? 'Published' : 'Unpublished'} ${parsed.data.ids.length} rules picture${parsed.data.ids.length === 1 ? '' : 's'}`)
  return { ok: true as const }
}

const MoveSchema = z.object({ id, direction: z.enum(['up', 'down']) })

// Swap a picture with its neighbour in the administration's order.
export async function moveRuleAction(input: z.infer<typeof MoveSchema>, supabaseOverride?: Db) {
  const parsed = MoveSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }
  const { supabase, ok } = await adminCaller(supabaseOverride)
  if (!ok) return NO

  const { data: rows } = await supabase.from('rule_documents').select('id, sort_order').order('sort_order').order('created_at')
  const list = rows ?? []
  const i = list.findIndex((r) => r.id === parsed.data.id)
  const j = parsed.data.direction === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= list.length) return { ok: true as const }

  // Renumber the whole list 1..n with the two swapped, so equal sort_order values can never leave the order ambiguous.
  const reordered = list.map((r) => r.id)
  ;[reordered[i], reordered[j]] = [reordered[j]!, reordered[i]!]
  const results = await Promise.all(reordered.map((rid, idx) => supabase.from('rule_documents').update({ sort_order: idx + 1 }).eq('id', rid)))
  if (results.some((r) => r.error)) return { ok: false as const, error: 'Could not reorder.' }
  return { ok: true as const }
}

export async function deleteRuleAction(input: { id: string }, supabaseOverride?: Db) {
  const parsed = z.object({ id }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }
  const { supabase, userId, ok } = await adminCaller(supabaseOverride)
  if (!ok || !userId) return NO

  const { data: row } = await supabase.from('rule_documents').select('title, storage_path').eq('id', parsed.data.id).maybeSingle()
  if (!row) return { ok: false as const, error: 'Picture not found.' }
  const { error } = await supabase.from('rule_documents').delete().eq('id', parsed.data.id)
  if (error) return { ok: false as const, error: 'Could not delete the picture.' }
  await createAdminClient().storage.from(RULES_BUCKET).remove([row.storage_path])
  await logAction(supabase, userId, `Deleted rules picture — ${row.title}`)
  return { ok: true as const }
}
