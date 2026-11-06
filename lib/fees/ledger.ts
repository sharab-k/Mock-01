import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/db/fetch-all'
import type { Database } from '@/types/supabase'
import { PAYMENT_LIST_LIMIT, isFeeStatus, toNumber, type FeeChargeStatus, type FeeMethod } from './constants'

type Db = SupabaseClient<Database>

export type FeeHead = {
  id: string
  name: string
  is_monthly: boolean
  default_amount: number | null
  is_active: boolean
}

export type ChargeBalance = {
  charge_id: string
  student_id: string
  head_id: string
  head_name: string
  year: number
  month: number | null
  due_date: string | null
  note: string | null
  amount: number
  discount: number
  due: number
  paid: number
  outstanding: number
  status: FeeChargeStatus
}

export type Receipt = {
  id: string
  receipt_no: number
  student_id: string
  charge_id: string
  amount: number
  paid_on: string
  method: FeeMethod
  reference: string | null
  note: string | null
  voided_at: string | null
  void_reason: string | null
}

export type StudentRef = {
  id: string
  full_name: string
  roll_number: string
  gr_number: string | null
  grade: string
  section: string
  tuition_fee: number | null
  monthly_discount: number
}

const STUDENT_COLS = 'id, full_name, roll_number, gr_number, grade_level, section, tuition_fee, monthly_discount'

type StudentRow = { id: string; full_name: string; roll_number: string; gr_number: string | null; grade_level: string; section: string; tuition_fee: number | null; monthly_discount: number }
const toStudentRef = (s: StudentRow): StudentRef => ({
  id: s.id, full_name: s.full_name, roll_number: s.roll_number, gr_number: s.gr_number,
  grade: s.grade_level, section: s.section,
  tuition_fee: s.tuition_fee === null ? null : toNumber(s.tuition_fee), monthly_discount: toNumber(s.monthly_discount),
})

export async function fetchFeeHeads(supabaseOverride?: Db): Promise<FeeHead[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.from('fee_heads').select('id, name, is_monthly, default_amount, is_active').order('sort_order').order('name')
  return (data ?? []).map((h) => ({ ...h, default_amount: h.default_amount === null ? null : toNumber(h.default_amount) }))
}

type BalanceRow = Database['public']['Views']['fee_charge_balances']['Row']
function toBalance(r: BalanceRow, headName: Map<string, string>): ChargeBalance {
  const status = r.status && isFeeStatus(r.status) ? r.status : 'unpaid'
  return {
    charge_id: r.charge_id!, student_id: r.student_id!, head_id: r.head_id!, head_name: headName.get(r.head_id!) ?? 'Fee',
    year: r.year!, month: r.month, due_date: r.due_date, note: r.note,
    amount: toNumber(r.amount), discount: toNumber(r.discount), due: toNumber(r.due), paid: toNumber(r.paid), outstanding: toNumber(r.outstanding),
    status,
  }
}

/** Everything one student owes and has paid, newest charge first. */
export async function fetchStudentLedger(studentId: string, supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const [studentRes, heads, balRes, recRes] = await Promise.all([
    supabase.from('students').select(STUDENT_COLS).eq('id', studentId).is('deleted_at', null).maybeSingle(),
    fetchFeeHeads(supabase),
    supabase.from('fee_charge_balances').select('*').eq('student_id', studentId).order('year', { ascending: false }).order('month', { ascending: false, nullsFirst: false }),
    supabase.from('fee_receipts').select('id, receipt_no, student_id, charge_id, amount, paid_on, method, reference, note, voided_at, void_reason').eq('student_id', studentId).order('paid_on', { ascending: false }).order('receipt_no', { ascending: false }),
  ])
  if (!studentRes.data) return null
  const names = new Map(heads.map((h) => [h.id, h.name]))
  const charges = (balRes.data ?? []).map((r) => toBalance(r, names))
  const receipts: Receipt[] = (recRes.data ?? []).map((r) => ({ ...r, amount: toNumber(r.amount) }))
  return { student: toStudentRef(studentRes.data), heads, charges, receipts }
}

export type MonthRow = {
  student: StudentRef
  charge: ChargeBalance | null
}

/** One row per active student for a month: their Tuition charge if one exists. */
export async function fetchMonthLedger(year: number, month: number, supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const heads = await fetchFeeHeads(supabase)
  const tuition = heads.find((h) => h.is_monthly)
  const names = new Map(heads.map((h) => [h.id, h.name]))

  const [students, balances] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from('students').select(STUDENT_COLS)
        .is('deleted_at', null).eq('status', 'active')
        .order('list_sort', { ascending: true }).order('id').range(from, to)),
    tuition
      ? fetchAllRows((from, to) =>
          supabase.from('fee_charge_balances').select('*').eq('year', year).eq('month', month).eq('head_id', tuition.id).order('charge_id').range(from, to))
      : Promise.resolve([] as BalanceRow[]),
  ])
  const byStudent = new Map(balances.map((b) => [b.student_id!, toBalance(b, names)]))
  const rows: MonthRow[] = students.map((s) => ({ student: toStudentRef(s), charge: byStudent.get(s.id) ?? null }))
  return { rows, heads }
}

export async function fetchOverview(from: string, to: string, supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.rpc('fee_overview', { p_from: from, p_to: to })
  const row = data?.[0]
  return {
    collected: toNumber(row?.collected),
    receiptCount: toNumber(row?.receipt_count),
    outstanding: toNumber(row?.outstanding),
  }
}

export type PaymentRow = Receipt & { student: Pick<StudentRef, 'full_name' | 'roll_number' | 'gr_number' | 'grade' | 'section'>; head_name: string }

export type PaymentFilters = { from: string; to: string; method?: FeeMethod | null; q?: string }

/** Receipts in a date range, newest first (capped — the totals come from fee_overview, never from this list). */
export async function fetchPayments(f: PaymentFilters, supabaseOverride?: Db) {
  const supabase = supabaseOverride ?? await createClient()
  let query = supabase
    .from('fee_receipts')
    .select('id, receipt_no, student_id, charge_id, amount, paid_on, method, reference, note, voided_at, void_reason, students(full_name, roll_number, gr_number, grade_level, section), fee_charges(fee_heads(name))')
    .gte('paid_on', f.from).lte('paid_on', f.to)
    .order('paid_on', { ascending: false }).order('receipt_no', { ascending: false })
    .limit(PAYMENT_LIST_LIMIT)
  if (f.method) query = query.eq('method', f.method)
  const { data } = await query
  const q = f.q?.trim().toLowerCase()
  const rows: PaymentRow[] = (data ?? []).map((r) => {
    const s = r.students as unknown as { full_name: string; roll_number: string; gr_number: string | null; grade_level: string; section: string } | null
    const c = r.fee_charges as unknown as { fee_heads: { name: string } | null } | null
    return {
      id: r.id, receipt_no: r.receipt_no, student_id: r.student_id, charge_id: r.charge_id, amount: toNumber(r.amount), paid_on: r.paid_on,
      method: r.method, reference: r.reference, note: r.note, voided_at: r.voided_at, void_reason: r.void_reason,
      student: { full_name: s?.full_name ?? '—', roll_number: s?.roll_number ?? '', gr_number: s?.gr_number ?? null, grade: s?.grade_level ?? '', section: s?.section ?? '' },
      head_name: c?.fee_heads?.name ?? 'Fee',
    }
  })
  return q
    ? rows.filter((r) => r.student.full_name.toLowerCase().includes(q) || r.student.roll_number.toLowerCase().includes(q) || (r.student.gr_number ?? '').toLowerCase().includes(q) || String(r.receipt_no) === q)
    : rows
}
