import { NextResponse } from 'next/server'
import { resolveRequestClient } from '@/lib/supabase/session'
import { formatRs, METHOD_LABEL, MONTH_NAMES } from '@/lib/fees/constants'
import { ISO_DATE } from '@/lib/finance/constants'
import { fetchExpenseBreakdown, fetchExpenses, fetchFinanceByPeriod, fetchFinanceTotals } from '@/lib/finance/ledger'
import { renderReportPdf, type ReportData } from '@/lib/finance/report-pdf'
import { fetchPayments } from '@/lib/fees/ledger'

export const runtime = 'nodejs'

const periodLabel = (iso: string, unit: 'day' | 'month' | 'year') =>
  unit === 'year' ? iso.slice(0, 4) : unit === 'month' ? `${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : iso

// Super Admin only. kind=summary (income and expenses by day / month / year) or
// kind=expenses (the expense report: by head, by payee, day by day, plus every line).
export async function GET(request: Request) {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? ''
  const to = url.searchParams.get('to') ?? ''
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) return NextResponse.json({ error: 'Choose a valid date range.' }, { status: 400 })
  const kind = url.searchParams.get('kind')

  let data: ReportData
  let fileName: string

  if (kind === 'summary') {
    const unitParam = url.searchParams.get('unit')
    const unit = unitParam === 'month' || unitParam === 'year' ? unitParam : 'day'
    const [totals, periods, receipts, expenses] = await Promise.all([
      fetchFinanceTotals(from, to, supabase),
      fetchFinanceByPeriod(from, to, unit, supabase),
      unit === 'day' && from === to ? fetchPayments({ from, to }, supabase) : Promise.resolve([]),
      unit === 'day' && from === to ? fetchExpenses({ from, to }, supabase) : Promise.resolve([]),
    ])
    data = {
      title: 'Income and Expense Report',
      subtitle: `${from === to ? from : `${from} to ${to}`}  ·  by ${unit}`,
      summary: [
        ['Total income collected', formatRs(totals.income)], ['Total expenses', formatRs(totals.expenses)],
        ['Net balance (income minus expenses)', formatRs(totals.net)], ['Total outstanding student fees', formatRs(totals.outstanding)],
      ],
      tables: [
        {
          title: `By ${unit}`,
          columns: [{ label: unit === 'year' ? 'Year' : unit === 'month' ? 'Month' : 'Date', width: 3 }, { label: 'Income', width: 2, align: 'right' }, { label: 'Expenses', width: 2, align: 'right' }, { label: 'Net', width: 2, align: 'right' }],
          rows: periods.map((p) => [periodLabel(p.period, unit), formatRs(p.income), formatRs(p.expenses), formatRs(p.net)]),
          footer: ['Total', formatRs(totals.income), formatRs(totals.expenses), formatRs(totals.net)],
        },
        ...(from === to ? [
          {
            title: 'Fees received',
            columns: [{ label: 'Receipt', width: 1.2 }, { label: 'Student', width: 3 }, { label: 'Class', width: 1 }, { label: 'Method', width: 1.6 }, { label: 'Amount', width: 1.6, align: 'right' as const }],
            rows: receipts.filter((r) => !r.voided_at).map((r) => [`#${r.receipt_no}`, r.student.full_name, `${r.student.grade}${r.student.section}`, METHOD_LABEL[r.method], formatRs(r.amount)]),
          },
          {
            title: 'Expenses',
            columns: [{ label: 'No.', width: 1 }, { label: 'Head', width: 2 }, { label: 'Paid to', width: 3 }, { label: 'Description', width: 3 }, { label: 'Amount', width: 1.6, align: 'right' as const }],
            rows: expenses.filter((x) => !x.voided_at).map((x) => [`#${x.expense_no}`, x.head_name, x.payee, x.description ?? '', formatRs(x.amount)]),
          },
        ] : []),
      ],
    }
    fileName = `income-expense-${from}-${to}.pdf`
  } else if (kind === 'expenses') {
    const head = url.searchParams.get('head')
    const headId = head && /^[0-9a-f-]{36}$/i.test(head) ? head : null
    const [bd, list] = await Promise.all([fetchExpenseBreakdown(from, to, headId, supabase), fetchExpenses({ from, to, headId }, supabase)])
    const live = list.filter((x) => !x.voided_at)
    const total = bd.byHead.reduce((n, r) => n + r.total, 0)
    data = {
      title: 'Expense Report',
      subtitle: `${from} to ${to}${headId && live[0] ? `  ·  ${live[0].head_name}` : '  ·  every head'}`,
      summary: [['Total spent', formatRs(total)], ['Expenses recorded', String(bd.byHead.reduce((n, r) => n + r.n, 0))]],
      tables: [
        { title: 'By head', columns: [{ label: 'Head', width: 4 }, { label: 'Count', width: 1, align: 'right' }, { label: 'Total', width: 2, align: 'right' }], rows: bd.byHead.map((r) => [r.label, String(r.n), formatRs(r.total)]), footer: ['Total', '', formatRs(total)] },
        { title: 'By payee', columns: [{ label: 'Paid to', width: 4 }, { label: 'Count', width: 1, align: 'right' }, { label: 'Total', width: 2, align: 'right' }], rows: bd.byPayee.map((r) => [r.label, String(r.n), formatRs(r.total)]) },
        { title: 'Day by day', columns: [{ label: 'Date', width: 4 }, { label: 'Count', width: 1, align: 'right' }, { label: 'Total', width: 2, align: 'right' }], rows: bd.byDay.map((r) => [r.label, String(r.n), formatRs(r.total)]) },
        { title: 'Every expense', columns: [{ label: 'Date', width: 1.6 }, { label: 'Head', width: 2 }, { label: 'Paid to', width: 3 }, { label: 'Narration', width: 3 }, { label: 'Amount', width: 1.6, align: 'right' }], rows: live.map((x) => [x.spent_on, x.head_name, x.payee, x.description ?? '', formatRs(x.amount)]) },
      ],
    }
    fileName = `expenses-${from}-${to}.pdf`
  } else {
    return NextResponse.json({ error: 'Unknown report.' }, { status: 400 })
  }

  const pdf = await renderReportPdf(data)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
