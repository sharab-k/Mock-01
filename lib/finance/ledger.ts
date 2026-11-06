import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { toNumber, type FeeMethod } from '@/lib/fees/constants'
import { EXPENSE_LIST_LIMIT } from './constants'

type Db = SupabaseClient<Database>

export type ExpenseHead = { id: string; name: string; is_active: boolean }

export type ExpenseRow = {
  id: string
  expense_no: number
  head_id: string
  head_name: string
  payee: string
  description: string | null
  amount: number
  spent_on: string
  method: FeeMethod
  reference: string | null
  voided_at: string | null
  void_reason: string | null
}

export async function fetchExpenseHeads(supabaseOverride?: Db): Promise<ExpenseHead[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.from('expense_heads').select('id, name, is_active').order('name')
  return data ?? []
}

export type ExpenseFilters = { from: string; to: string; headId?: string | null; q?: string }

export async function fetchExpenses(f: ExpenseFilters, supabaseOverride?: Db): Promise<ExpenseRow[]> {
  const supabase = supabaseOverride ?? await createClient()
  let query = supabase
    .from('expenses')
    .select('id, expense_no, head_id, payee, description, amount, spent_on, method, reference, voided_at, void_reason, expense_heads(name)')
    .gte('spent_on', f.from).lte('spent_on', f.to)
    .order('spent_on', { ascending: false }).order('expense_no', { ascending: false })
    .limit(EXPENSE_LIST_LIMIT)
  if (f.headId) query = query.eq('head_id', f.headId)
  const { data } = await query
  const q = f.q?.trim().toLowerCase()
  const rows: ExpenseRow[] = (data ?? []).map((r) => ({
    id: r.id, expense_no: r.expense_no, head_id: r.head_id,
    head_name: (r.expense_heads as unknown as { name: string } | null)?.name ?? 'Other',
    payee: r.payee, description: r.description, amount: toNumber(r.amount), spent_on: r.spent_on, method: r.method,
    reference: r.reference, voided_at: r.voided_at, void_reason: r.void_reason,
  }))
  return q ? rows.filter((r) => r.payee.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q) || r.head_name.toLowerCase().includes(q) || String(r.expense_no) === q) : rows
}

export type FinanceTotals = { income: number; expenses: number; net: number; outstanding: number; receiptCount: number; expenseCount: number }

export async function fetchFinanceTotals(from: string, to: string, supabaseOverride?: Db): Promise<FinanceTotals> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.rpc('finance_totals', { p_from: from, p_to: to })
  const r = data?.[0]
  return {
    income: toNumber(r?.income), expenses: toNumber(r?.expenses), net: toNumber(r?.net), outstanding: toNumber(r?.outstanding),
    receiptCount: toNumber(r?.receipt_count), expenseCount: toNumber(r?.expense_count),
  }
}

export type PeriodRow = { period: string; income: number; expenses: number; net: number }

export async function fetchFinanceByPeriod(from: string, to: string, unit: 'day' | 'month' | 'year', supabaseOverride?: Db): Promise<PeriodRow[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.rpc('finance_by_period', { p_from: from, p_to: to, p_unit: unit })
  return (data ?? []).map((r) => ({ period: r.period, income: toNumber(r.income), expenses: toNumber(r.expenses), net: toNumber(r.income) - toNumber(r.expenses) }))
}

export type BreakdownRow = { label: string; total: number; n: number }
export type ExpenseBreakdown = { byHead: BreakdownRow[]; byPayee: BreakdownRow[]; byDay: BreakdownRow[] }

export async function fetchExpenseBreakdown(from: string, to: string, headId: string | null, supabaseOverride?: Db): Promise<ExpenseBreakdown> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.rpc('expense_breakdown', { p_from: from, p_to: to, p_head: headId as string } /* null = every head; the generated type cannot express a nullable argument */)
  const pick = (kind: string): BreakdownRow[] => (data ?? []).filter((r) => r.kind === kind).map((r) => ({ label: r.label, total: toNumber(r.total), n: toNumber(r.n) }))
  return { byHead: pick('head'), byPayee: pick('payee'), byDay: pick('day').sort((a, b) => a.label.localeCompare(b.label)) }
}
