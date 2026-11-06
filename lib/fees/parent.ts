import { createClient } from '@/lib/supabase/server'
import { isFeeStatus, toNumber, type FeeChargeStatus } from './constants'
import type { ChargeBalance, Receipt } from './ledger'

export type ChildVoucher = { id: string; voucher_no: number; year: number; month: number; due_date: string; outstanding: number; status: FeeChargeStatus }

export type ChildFees = {
  id: string
  full_name: string
  roll_number: string
  grade: string
  section: string
  charges: ChargeBalance[]
  receipts: Receipt[]
  vouchers: ChildVoucher[]
  outstanding: number
}

// A parent session reads only their own children's fee rows: the parent_student_links
// scope here, and again RLS on fee_charges / fee_receipts (live rows only, never voided).
export async function fetchMyChildrenFees(): Promise<ChildFees[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: links } = await supabase
    .from('parent_student_links')
    .select('students(id, full_name, roll_number, grade_level, section)')
    .eq('parent_id', user.id)
  const kids = (links ?? []).map((l) => l.students).filter((s): s is NonNullable<typeof s> => !!s)
  if (kids.length === 0) return []
  const ids = kids.map((k) => k.id)

  const [heads, balances, receipts, vouchers] = await Promise.all([
    supabase.from('fee_heads').select('id, name'),
    supabase.from('fee_charge_balances').select('*').in('student_id', ids).order('year', { ascending: false }).order('month', { ascending: false, nullsFirst: false }),
    supabase.from('fee_receipts').select('id, receipt_no, student_id, charge_id, amount, paid_on, method, reference, note, voided_at, void_reason').in('student_id', ids).order('paid_on', { ascending: false }).order('receipt_no', { ascending: false }),
    supabase.from('fee_voucher_status').select('*').in('student_id', ids).order('year', { ascending: false }).order('month', { ascending: false }),
  ])
  const names = new Map((heads.data ?? []).map((h) => [h.id, h.name]))

  return kids.map((k) => {
    const charges: ChargeBalance[] = (balances.data ?? []).filter((b) => b.student_id === k.id).map((b) => ({
      charge_id: b.charge_id!, student_id: b.student_id!, head_id: b.head_id!, head_name: names.get(b.head_id!) ?? 'Fee',
      year: b.year!, month: b.month, due_date: b.due_date, note: b.note,
      amount: toNumber(b.amount), discount: toNumber(b.discount), due: toNumber(b.due), paid: toNumber(b.paid), outstanding: toNumber(b.outstanding),
      status: b.status && isFeeStatus(b.status) ? b.status : 'unpaid',
    }))
    return {
      id: k.id, full_name: k.full_name, roll_number: k.roll_number, grade: k.grade_level, section: k.section,
      charges,
      receipts: (receipts.data ?? []).filter((r) => r.student_id === k.id).map((r) => ({ ...r, amount: toNumber(r.amount) })),
      vouchers: (vouchers.data ?? []).filter((v) => v.student_id === k.id).map((v) => ({
        id: v.id!, voucher_no: v.voucher_no!, year: v.year!, month: v.month!, due_date: v.due_date!, outstanding: toNumber(v.outstanding),
        status: v.status && isFeeStatus(v.status) ? v.status : 'unpaid',
      })),
      outstanding: charges.reduce((n, c) => n + c.outstanding, 0),
    }
  })
}
