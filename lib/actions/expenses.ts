'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import { FEE_METHODS, formatRs, toNumber } from '@/lib/fees/constants'
import type { Database } from '@/types/supabase'

type Db = SupabaseClient<Database>

async function requireSuperAdminCaller(supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const RecordExpenseSchema = z.object({
  // A head can be typed straight into the form; a new name is kept for next time.
  headName: z.string().trim().min(1, 'Choose or type a head').max(60),
  payee: z.string().trim().min(1, 'Who was it paid to?').max(120),
  description: z.string().trim().max(300).optional(),
  amount: z.number().finite().gt(0, 'Amount must be more than zero').max(100_000_000),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => d <= todayIso(), 'Date cannot be in the future'),
  method: z.enum(FEE_METHODS),
  reference: z.string().trim().max(100).optional(),
})

export async function recordExpenseAction(input: z.infer<typeof RecordExpenseSchema>, supabaseOverride?: Db) {
  const parsed = RecordExpenseSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  const e = parsed.data

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  // Find the head by name (case-insensitive), or create it.
  const { data: existing } = await supabase.from('expense_heads').select('id').ilike('name', e.headName.replace(/[%_\\]/g, (c) => `\\${c}`)).maybeSingle()
  let headId = existing?.id
  if (!headId) {
    const created = await supabase.from('expense_heads').insert({ name: e.headName }).select('id').single()
    if (created.error || !created.data) return { ok: false as const, error: 'Could not save the head.' }
    headId = created.data.id
  }

  const { data, error } = await supabase.from('expenses').insert({
    head_id: headId, payee: e.payee, description: e.description || null, amount: e.amount, spent_on: e.spentOn,
    method: e.method, reference: e.reference || null, created_by: userId,
  }).select('expense_no').single()
  if (error || !data) return { ok: false as const, error: 'Could not record the expense.' }

  await logAction(supabase, userId, `Recorded expense — ${e.headName} · ${e.payee} · ${formatRs(e.amount)} · #${data.expense_no}`)
  return { ok: true as const, expenseNo: data.expense_no }
}

const VoidExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  reason: z.string().trim().min(3, 'Give a reason').max(300),
})

export async function voidExpenseAction(input: z.infer<typeof VoidExpenseSchema>, supabaseOverride?: Db) {
  const parsed = VoidExpenseSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const { data, error } = await supabase.from('expenses')
    .update({ voided_at: new Date().toISOString(), voided_by: userId, void_reason: parsed.data.reason })
    .eq('id', parsed.data.expenseId).is('voided_at', null)
    .select('expense_no, payee, amount').maybeSingle()
  if (error || !data) return { ok: false as const, error: 'Could not void the expense (it may already be voided).' }

  await logAction(supabase, userId, `Voided expense #${data.expense_no} — ${data.payee} · ${formatRs(toNumber(data.amount))} · ${parsed.data.reason}`)
  return { ok: true as const }
}
