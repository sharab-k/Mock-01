import Link from 'next/link'
import { Download, Landmark } from 'lucide-react'
import { METHOD_LABEL, MONTH_NAMES, formatRs } from '@/lib/fees/constants'
import { fetchPayments } from '@/lib/fees/ledger'
import { ISO_DATE, monthRange } from '@/lib/finance/constants'
import { fetchExpenses, fetchFinanceByPeriod, fetchFinanceTotals } from '@/lib/finance/ledger'

type Props = { searchParams: Promise<{ view?: string; date?: string; month?: string; year?: string }> }

const INPUT = 'text-[13px] font-mono border border-neutral-200 rounded-xl px-3 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-ink-400'
const TH = 'px-3 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-left'

export default async function FinancePage({ searchParams }: Props) {
  const sp = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const view = sp.view === 'month' || sp.view === 'year' ? sp.view : 'day'
  const date = sp.date && ISO_DATE.test(sp.date) ? sp.date : today
  const monthParam = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7)
  const yearParam = sp.year && /^\d{4}$/.test(sp.year) ? sp.year : today.slice(0, 4)

  let from = date, to = date, unit: 'day' | 'month' = 'day', label = date
  if (view === 'month') {
    const [y, m] = monthParam.split('-').map(Number) as [number, number]
    ;({ from, to } = monthRange(y, m)); label = `${MONTH_NAMES[m - 1]} ${y}`
  } else if (view === 'year') {
    from = `${yearParam}-01-01`; to = `${yearParam}-12-31`; unit = 'month'; label = yearParam
  }

  const [totals, periods, receipts, expenses] = await Promise.all([
    fetchFinanceTotals(from, to),
    fetchFinanceByPeriod(from, to, unit),
    view === 'day' ? fetchPayments({ from, to }) : Promise.resolve([]),
    view === 'day' ? fetchExpenses({ from, to }) : Promise.resolve([]),
  ])
  const pdf = `/api/finance/report?kind=summary&unit=${unit}&from=${from}&to=${to}`
  const tab = (v: string, text: string) => (
    <Link href={`/super-admin/finance?view=${v}`} className={`text-[12.5px] font-semibold px-3.5 py-2 rounded-xl no-underline ${view === v ? 'bg-ink-700 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'}`}>{text}</Link>
  )
  const tiles: [string, string, string][] = [
    ['Income collected', formatRs(totals.income), 'text-success'],
    ['Expenses', formatRs(totals.expenses), 'text-neutral-900'],
    ['Net balance', formatRs(totals.net), totals.net < 0 ? 'text-danger' : 'text-neutral-900'],
    ['Total outstanding fees', formatRs(totals.outstanding), totals.outstanding > 0 ? 'text-warning' : 'text-neutral-900'],
  ]

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><Landmark size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Income and expense</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Pick a day, a month or a year to see what came in, what went out, and the balance.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">{tab('day', 'Daily')}{tab('month', 'Monthly')}{tab('year', 'Yearly')}</div>

      <form method="get" className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-end gap-3 flex-wrap">
        <input type="hidden" name="view" value={view} />
        {view === 'day' && <div><label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5" htmlFor="f-date">Date</label><input id="f-date" name="date" type="date" max={today} defaultValue={date} className={INPUT} /></div>}
        {view === 'month' && <div><label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5" htmlFor="f-month">Month</label><input id="f-month" name="month" type="month" defaultValue={monthParam} className={INPUT} /></div>}
        {view === 'year' && <div><label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5" htmlFor="f-year">Year</label><input id="f-year" name="year" type="number" min={2020} max={2100} defaultValue={yearParam} className={`${INPUT} w-28`} /></div>}
        <button type="submit" className="inline-flex items-center text-[12.5px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-2.5 rounded-xl">Show</button>
        <a href={pdf} className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700 bg-ink-50 hover:bg-ink-100 px-3 py-2.5 rounded-xl no-underline"><Download size={14} /> Download PDF</a>
      </form>

      <p className="text-[13px] text-neutral-500">Showing <span className="font-semibold text-neutral-800">{label}</span></p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([t, v, tone]) => (
          <div key={t} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{t}</p>
            <p className={`mt-1 text-[17px] font-bold font-mono ${tone}`}>{v}</p>
          </div>
        ))}
      </div>

      {view !== 'day' && (
        <section className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <h2 className="px-5 py-3.5 text-[14px] font-semibold text-neutral-900 border-b border-neutral-100">{unit === 'month' ? 'Month by month' : 'Day by day'}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[460px]">
              <thead><tr className="bg-neutral-50"><th className={`${TH} pl-5`}>{unit === 'month' ? 'Month' : 'Date'}</th><th className={`${TH} text-right`}>Income</th><th className={`${TH} text-right`}>Expenses</th><th className={`${TH} text-right pr-5`}>Net</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {periods.map((p) => (
                  <tr key={p.period}>
                    <td className="pl-5 px-3 py-2.5 font-mono text-[12px]">{unit === 'month' ? `${MONTH_NAMES[Number(p.period.slice(5, 7)) - 1]} ${p.period.slice(0, 4)}` : p.period}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px]">{formatRs(p.income)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px]">{formatRs(p.expenses)}</td>
                    <td className={`px-3 pr-5 py-2.5 text-right font-mono text-[12px] font-semibold ${p.net < 0 ? 'text-danger' : ''}`}>{formatRs(p.net)}</td>
                  </tr>
                ))}
                {periods.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-neutral-400">No income or expenses in this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === 'day' && (
        <>
          <section className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
            <h2 className="px-5 py-3.5 text-[14px] font-semibold text-neutral-900 border-b border-neutral-100">Fees received · {totals.receiptCount}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[560px]">
                <thead><tr className="bg-neutral-50"><th className={`${TH} pl-5`}>Receipt</th><th className={TH}>Student</th><th className={TH}>Class</th><th className={TH}>Method</th><th className={`${TH} text-right pr-5`}>Amount</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {receipts.filter((r) => !r.voided_at).map((r) => (
                    <tr key={r.id}><td className="pl-5 px-3 py-2.5 font-mono text-[12px]">#{r.receipt_no}</td><td className="px-3 py-2.5">{r.student.full_name}</td><td className="px-3 py-2.5 font-mono text-[12px]">{r.student.grade}{r.student.section}</td><td className="px-3 py-2.5">{METHOD_LABEL[r.method]}</td><td className="px-3 pr-5 py-2.5 text-right font-mono text-[12px] font-semibold">{formatRs(r.amount)}</td></tr>
                  ))}
                  {totals.receiptCount === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-neutral-400">No fees received this day.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
            <h2 className="px-5 py-3.5 text-[14px] font-semibold text-neutral-900 border-b border-neutral-100">Expenses · {totals.expenseCount}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[560px]">
                <thead><tr className="bg-neutral-50"><th className={`${TH} pl-5`}>No.</th><th className={TH}>Head</th><th className={TH}>Paid to</th><th className={TH}>Narration</th><th className={`${TH} text-right pr-5`}>Amount</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {expenses.filter((x) => !x.voided_at).map((x) => (
                    <tr key={x.id}><td className="pl-5 px-3 py-2.5 font-mono text-[12px]">#{x.expense_no}</td><td className="px-3 py-2.5">{x.head_name}</td><td className="px-3 py-2.5">{x.payee}</td><td className="px-3 py-2.5 text-neutral-600">{x.description ?? '—'}</td><td className="px-3 pr-5 py-2.5 text-right font-mono text-[12px] font-semibold">{formatRs(x.amount)}</td></tr>
                  ))}
                  {totals.expenseCount === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-neutral-400">No expenses this day.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}
