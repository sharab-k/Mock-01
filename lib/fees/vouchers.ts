import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/db/fetch-all'
import type { Database } from '@/types/supabase'
import { STATUS_LABEL, isFeeStatus, monthLabel, toNumber, type FeeChargeStatus } from './constants'
import type { VoucherData } from './voucher-pdf'

type Db = SupabaseClient<Database>

export type VoucherCandidate = {
  student_id: string
  full_name: string
  roll_number: string
  gr_number: string | null
  grade: string
  section: string
  tuition_fee: number | null
  voucher: { id: string; voucher_no: number; due: number; paid: number; outstanding: number; status: FeeChargeStatus; due_date: string } | null
}

const GRADE_ORDER = ['9', '10', '11', '12', 'ICOM-1', 'ICOM-2']
export const classOrder = (a: { grade: string; section: string }, b: { grade: string; section: string }) =>
  (GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade)) || a.section.localeCompare(b.section)

/**
 * Every ACTIVE student, with this month's voucher if one exists. Students who have left
 * or whose admission was cancelled (inactive / deleted) are never listed, so they can
 * never be picked for a voucher.
 */
export async function fetchVoucherCandidates(year: number, month: number, supabaseOverride?: Db): Promise<VoucherCandidate[]> {
  const supabase = supabaseOverride ?? await createClient()
  const [students, vouchers] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from('students').select('id, full_name, roll_number, gr_number, grade_level, section, tuition_fee')
        .is('deleted_at', null).eq('status', 'active')
        .order('list_sort', { ascending: true }).order('id').range(from, to)),
    fetchAllRows((from, to) =>
      supabase.from('fee_voucher_status').select('*').eq('year', year).eq('month', month).order('id').range(from, to)),
  ])
  const byStudent = new Map(vouchers.map((v) => [v.student_id!, v]))
  return students
    .map((s): VoucherCandidate => {
      const v = byStudent.get(s.id)
      return {
        student_id: s.id, full_name: s.full_name, roll_number: s.roll_number, gr_number: s.gr_number, grade: s.grade_level, section: s.section,
        tuition_fee: s.tuition_fee === null ? null : toNumber(s.tuition_fee),
        voucher: v ? { id: v.id!, voucher_no: v.voucher_no!, due: toNumber(v.due), paid: toNumber(v.paid), outstanding: toNumber(v.outstanding), status: v.status && isFeeStatus(v.status) ? v.status : 'unpaid', due_date: v.due_date! } : null,
      }
    })
    .sort(classOrder)
}

/** The data each voucher page prints, in class-then-section-then-roll order. RLS decides which vouchers the caller may see. */
export async function buildVoucherData(voucherIds: string[], supabaseOverride?: Db): Promise<VoucherData[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data: vouchers } = await supabase.from('fee_voucher_status').select('*').in('id', voucherIds)
  if (!vouchers?.length) return []

  const studentIds = Array.from(new Set(vouchers.map((v) => v.student_id!)))
  const [studentsRes, chargesRes, headsRes] = await Promise.all([
    supabase.from('students').select('id, full_name, roll_number, gr_number, grade_level, section, list_sort').in('id', studentIds),
    supabase.from('fee_charge_balances').select('*').in('student_id', studentIds),
    supabase.from('fee_heads').select('id, name'),
  ])
  const students = new Map((studentsRes.data ?? []).map((s) => [s.id, s]))
  const heads = new Map((headsRes.data ?? []).map((h) => [h.id, h.name]))

  const out = vouchers.flatMap((v) => {
    const s = students.get(v.student_id!)
    if (!s) return []
    const charges = (chargesRes.data ?? []).filter((c) => c.student_id === v.student_id && c.year === v.year && c.month === v.month)
    const data: VoucherData = {
      voucherNo: v.voucher_no!, studentName: s.full_name, grNumber: s.gr_number, rollNumber: s.roll_number, grade: s.grade_level, section: s.section,
      periodLabel: monthLabel(v.year!, v.month!), dueDate: v.due_date!,
      lines: charges.map((c) => ({ label: heads.get(c.head_id!) ?? 'Fee', amount: toNumber(c.amount) })),
      discount: charges.reduce((n, c) => n + toNumber(c.discount), 0),
      total: toNumber(v.due), paid: toNumber(v.paid), outstanding: toNumber(v.outstanding),
      statusLabel: STATUS_LABEL[v.status && isFeeStatus(v.status) ? v.status : 'unpaid'],
    }
    return [{ data, grade: s.grade_level, section: s.section, sort: s.list_sort ?? '' }]
  })
  out.sort((a, b) => classOrder(a, b) || (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0))
  return out.map((o) => o.data)
}
