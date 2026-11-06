'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import { FEE_METHODS, MONTH_NAMES, formatRs, monthLabel, toNumber } from '@/lib/fees/constants'
import type { Database } from '@/types/supabase'

type Db = SupabaseClient<Database>

// Defense in depth — RLS (Super Admin only writes on every fee table) is the real
// boundary; this just fails fast with a clean error.
async function requireSuperAdminCaller(supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

const NOT_AUTHORIZED = { ok: false as const, error: 'Not authorized.' }
const INVALID = { ok: false as const, error: 'Invalid request.' }

const money = z.number().finite().min(0).max(10_000_000)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const todayIso = () => new Date().toISOString().slice(0, 10)

// ── Record a payment against a charge ───────────────────────────────────
const RecordPaymentSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1).max(200),
  chargeId: z.string().uuid(),
  amount: money.refine((n) => n > 0, 'Amount must be more than zero'),
  paidOn: isoDate.refine((d) => d <= todayIso(), 'Payment date cannot be in the future'),
  method: z.enum(FEE_METHODS),
  reference: z.string().trim().max(100).optional(),
  note: z.string().trim().max(300).optional(),
})

export async function recordPaymentAction(input: z.infer<typeof RecordPaymentSchema>, supabaseOverride?: Db) {
  const parsed = RecordPaymentSchema.safeParse(input)
  if (!parsed.success) return { ...INVALID, error: parsed.error.issues[0]?.message ?? INVALID.error }
  const p = parsed.data

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return NOT_AUTHORIZED

  const { data: bal } = await supabase.from('fee_charge_balances').select('outstanding, student_id').eq('charge_id', p.chargeId).maybeSingle()
  if (!bal || bal.student_id !== p.studentId) return { ok: false as const, error: 'That charge was not found for this student.' }
  const outstanding = toNumber(bal.outstanding)
  if (p.amount > outstanding) return { ok: false as const, error: `Only ${formatRs(outstanding)} is outstanding on this charge.` }

  const { data, error } = await supabase.from('fee_receipts').insert({
    student_id: p.studentId, charge_id: p.chargeId, amount: p.amount, paid_on: p.paidOn, method: p.method,
    reference: p.reference || null, note: p.note || null, received_by: userId,
  }).select('receipt_no').single()
  if (error || !data) return { ok: false as const, error: 'Could not record the payment.' }

  await logAction(supabase, userId, `Recorded fee payment — ${p.studentName} · ${formatRs(p.amount)} · ${p.method} · receipt #${data.receipt_no}`)
  return { ok: true as const, receiptNo: data.receipt_no }
}

// ── Void a receipt (never deleted) ──────────────────────────────────────
const VoidReceiptSchema = z.object({
  receiptId: z.string().uuid(),
  studentName: z.string().min(1).max(200),
  reason: z.string().trim().min(3, 'Give a reason').max(300),
})

export async function voidReceiptAction(input: z.infer<typeof VoidReceiptSchema>, supabaseOverride?: Db) {
  const parsed = VoidReceiptSchema.safeParse(input)
  if (!parsed.success) return { ...INVALID, error: parsed.error.issues[0]?.message ?? INVALID.error }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return NOT_AUTHORIZED

  const { data, error } = await supabase.from('fee_receipts')
    .update({ voided_at: new Date().toISOString(), voided_by: userId, void_reason: parsed.data.reason })
    .eq('id', parsed.data.receiptId).is('voided_at', null)
    .select('receipt_no, amount').maybeSingle()
  if (error || !data) return { ok: false as const, error: 'Could not void the receipt (it may already be voided).' }

  await logAction(supabase, userId, `Voided fee receipt #${data.receipt_no} — ${parsed.data.studentName} · ${formatRs(toNumber(data.amount))} · ${parsed.data.reason}`)
  return { ok: true as const }
}

// ── Add a one-off or monthly charge ─────────────────────────────────────
const AddChargeSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1).max(200),
  headId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12).nullable(),
  amount: money,
  discount: money.default(0),
  dueDate: isoDate.nullable(),
  note: z.string().trim().max(300).optional(),
}).refine((v) => v.discount <= v.amount, { message: 'Discount cannot be more than the amount', path: ['discount'] })

export async function addChargeAction(input: z.input<typeof AddChargeSchema>, supabaseOverride?: Db) {
  const parsed = AddChargeSchema.safeParse(input)
  if (!parsed.success) return { ...INVALID, error: parsed.error.issues[0]?.message ?? INVALID.error }
  const c = parsed.data

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return NOT_AUTHORIZED

  const { error } = await supabase.from('fee_charges').insert({
    student_id: c.studentId, head_id: c.headId, year: c.year, month: c.month, amount: c.amount, discount: c.discount,
    due_date: c.dueDate, note: c.note || null, created_by: userId,
  })
  if (error) {
    return { ok: false as const, error: error.code === '23505' ? 'This student already has that fee for that month.' : 'Could not add the charge.' }
  }
  await logAction(supabase, userId, `Added fee charge — ${c.studentName} · ${formatRs(c.amount)} · ${monthLabel(c.year, c.month)}`)
  return { ok: true as const }
}

// ── Generate a month's Tuition charges for every active student ─────────
const GenerateSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  dueDate: isoDate,
})

export async function generateMonthlyChargesAction(input: z.infer<typeof GenerateSchema>, supabaseOverride?: Db) {
  const parsed = GenerateSchema.safeParse(input)
  if (!parsed.success) return INVALID

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return NOT_AUTHORIZED

  const { data, error } = await supabase.rpc('fee_generate_monthly_charges', { p_year: parsed.data.year, p_month: parsed.data.month, p_due: parsed.data.dueDate })
  if (error) return { ok: false as const, error: 'Could not generate the charges.' }

  await logAction(supabase, userId, `Generated monthly fee charges — ${monthLabel(parsed.data.year, parsed.data.month)} · ${data ?? 0} students`)
  return { ok: true as const, created: toNumber(data) }
}

// ── Fee heads ───────────────────────────────────────────────────────────
const SaveHeadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(60),
  isMonthly: z.boolean(),
  defaultAmount: money.nullable(),
  isActive: z.boolean(),
})

export async function saveFeeHeadAction(input: z.infer<typeof SaveHeadSchema>, supabaseOverride?: Db) {
  const parsed = SaveHeadSchema.safeParse(input)
  if (!parsed.success) return { ...INVALID, error: parsed.error.issues[0]?.message ?? INVALID.error }
  const h = parsed.data

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return NOT_AUTHORIZED

  const row = { name: h.name, is_monthly: h.isMonthly, default_amount: h.defaultAmount, is_active: h.isActive }
  const { error } = h.id
    ? await supabase.from('fee_heads').update(row).eq('id', h.id)
    : await supabase.from('fee_heads').insert(row)
  if (error) return { ok: false as const, error: error.code === '23505' ? 'A fee head with that name already exists.' : 'Could not save the fee head.' }

  await logAction(supabase, userId, `${h.id ? 'Edited' : 'Added'} fee head — ${h.name}`)
  return { ok: true as const }
}

// ── Monthly paid / unpaid toggle (the mobile app's Fees screen) ─────────
// Kept so the phone app keeps working. It now writes to the ledger: "paid" makes sure
// the month has a Tuition charge and records a cash receipt for whatever is still
// outstanding; "unpaid" voids that month's receipts. fee_payments follows by trigger.
const SetFeeStatusSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1).max(200),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  status: z.enum(['paid', 'unpaid']),
})

export async function setFeeStatusAction(input: z.infer<typeof SetFeeStatusSchema>, supabaseOverride?: Db) {
  const parsed = SetFeeStatusSchema.safeParse(input)
  if (!parsed.success) return INVALID
  const { studentId, studentName, year, month, status } = parsed.data

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return NOT_AUTHORIZED

  const { data: head } = await supabase.from('fee_heads').select('id').eq('is_monthly', true).eq('name', 'Tuition').maybeSingle()
  if (!head) return { ok: false as const, error: 'Tuition fee head is missing.' }

  let { data: charge } = await supabase.from('fee_charges').select('id').eq('student_id', studentId).eq('head_id', head.id).eq('year', year).eq('month', month).is('voided_at', null).maybeSingle()

  if (status === 'paid') {
    if (!charge) {
      const { data: s } = await supabase.from('students').select('tuition_fee, monthly_discount').eq('id', studentId).maybeSingle()
      const amount = toNumber(s?.tuition_fee)
      const discount = Math.min(toNumber(s?.monthly_discount), amount)
      const created = await supabase.from('fee_charges').insert({
        student_id: studentId, head_id: head.id, year, month, amount, discount, due_date: `${year}-${String(month).padStart(2, '0')}-10`, created_by: userId,
      }).select('id').single()
      if (created.error || !created.data) return { ok: false as const, error: 'Could not update fee status.' }
      charge = created.data
    }
    const { data: bal } = await supabase.from('fee_charge_balances').select('outstanding').eq('charge_id', charge.id).maybeSingle()
    const owed = toNumber(bal?.outstanding)
    if (owed > 0) {
      const rec = await supabase.from('fee_receipts').insert({ student_id: studentId, charge_id: charge.id, amount: owed, paid_on: todayIso(), method: 'cash', note: 'Marked paid', received_by: userId })
      if (rec.error) return { ok: false as const, error: 'Could not update fee status.' }
    }
  } else if (charge) {
    const { error } = await supabase.from('fee_receipts')
      .update({ voided_at: new Date().toISOString(), voided_by: userId, void_reason: 'Marked unpaid' })
      .eq('charge_id', charge.id).is('voided_at', null)
    if (error) return { ok: false as const, error: 'Could not update fee status.' }
  }

  await logAction(supabase, userId, `Marked fee ${status} — ${studentName} · ${MONTH_NAMES[month - 1]} ${year}`)
  return { ok: true as const }
}

// ── Vouchers ────────────────────────────────────────────────────────────
// Creates (or refreshes) the month's voucher for each chosen student. Students who have
// left (inactive) are skipped by the database function, so they can never get one.
const GenerateVouchersSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  dueDate: isoDate,
  studentIds: z.array(z.string().uuid()).min(1, 'Select at least one student').max(2000),
})

export async function generateVouchersAction(input: z.infer<typeof GenerateVouchersSchema>, supabaseOverride?: Db) {
  const parsed = GenerateVouchersSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return NOT_AUTHORIZED

  const ids = Array.from(new Set(parsed.data.studentIds))
  const { data, error } = await supabase.rpc('fee_generate_vouchers', { p_year: parsed.data.year, p_month: parsed.data.month, p_due: parsed.data.dueDate, p_student_ids: ids })
  if (error) return { ok: false as const, error: 'Could not generate the vouchers.' }

  const made = toNumber(data)
  await logAction(supabase, userId, `Generated fee vouchers — ${monthLabel(parsed.data.year, parsed.data.month)} · ${made} of ${ids.length} selected`)
  return { ok: true as const, generated: made, skipped: ids.length - made }
}
