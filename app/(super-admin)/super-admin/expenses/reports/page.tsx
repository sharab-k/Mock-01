import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { formatRs } from '@/lib/fees/constants'
import { ISO_DATE, firstOfMonth } from '@/lib/finance/constants'
import { fetchExpenseBreakdown, fetchExpenseHeads, type BreakdownRow } from '@/lib/finance/ledger'

type Props = { searchParams: Promise<{ from?: string; to?: string; head?: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const INPUT = 'w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10'
const LABEL = 'block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5'

function Breakdown({ title, rows, labelHeader }: { title: string; rows: BreakdownRow[]; labelHeader: string }) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
      <h2 className="px-5 py-3.5 text-[14px] font-semibold text-neutral-900 border-b border-neutral-100">{title}</h2>
      <table className="w-full text-[13px]">
        <thead><tr className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider"><th className="px-5 py-2.5 text-left">{labelHeader}</th><th className="px-3 py-2.5 text-right">Count</th><th className="px-5 py-2.5 text-right">Total</th></tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((r) => <tr key={r.label}><td className="px-5 py-2.5">{r.label}</td><td className="px-3 py-2.5 text-right font-mono text-[12px]">{r.n}</td><td className="px-5 py-2.5 text-right font-mono text-[12px] font-semibold">{formatRs(r.total)}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={3} className="px-5 py-6 text-center text-neutral-400">Nothing in this range.</td></tr>}
        </tbody>
      </table>
    </section>
  )
}

export default async function ExpenseReportsPage({ searchParams }: Props) {
  const sp = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const from = sp.from && ISO_DATE.test(sp.from) ? sp.from : firstOfMonth(today)
  const to = sp.to && ISO_DATE.test(sp.to) ? sp.to : today
  const headId = sp.head && UUID.test(sp.head) ? sp.head : ''
  const ran = Boolean(sp.from && sp.to) && from <= to

  const heads = await fetchExpenseHeads()
  const bd = ran ? await fetchExpenseBreakdown(from, to, headId || null) : null
  const total = bd?.byHead.reduce((n, r) => n + r.total, 0) ?? 0
  const pdf = `/api/finance/report?kind=expenses&from=${from}&to=${to}${headId ? `&head=${headId}` : ''}`

  return (
    <>
      <div>
        <Link href="/super-admin/expenses" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 no-underline mb-4"><ArrowLeft size={13} /> Expenses</Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Expense reports</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Where the money went over a range — by head, by who was paid, and day by day.</p>
      </div>

      <form method="get" className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div><label className={LABEL} htmlFor="e-from">From</label><input id="e-from" name="from" type="date" defaultValue={from} className={`${INPUT} font-mono`} required /></div>
        <div><label className={LABEL} htmlFor="e-to">To</label><input id="e-to" name="to" type="date" defaultValue={to} className={`${INPUT} font-mono`} required /></div>
        <div>
          <label className={LABEL} htmlFor="e-head">Head</label>
          <select id="e-head" name="head" defaultValue={headId} className={INPUT}><option value="">Every head</option>{heads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
        </div>
        <button type="submit" className="inline-flex justify-center items-center text-[12.5px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-2.5 rounded-xl">Run</button>
      </form>

      {ran && bd && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[14px] font-semibold text-neutral-900">Total spent <span className="font-mono">{formatRs(total)}</span> · {from} to {to}</p>
            <a href={pdf} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700 bg-ink-50 hover:bg-ink-100 px-3 py-2 rounded-xl no-underline"><Download size={14} /> Download PDF</a>
          </div>
          <Breakdown title="By head" rows={bd.byHead} labelHeader="Head" />
          <Breakdown title="By payee" rows={bd.byPayee} labelHeader="Paid to" />
          <Breakdown title="Day by day" rows={bd.byDay} labelHeader="Date" />
        </>
      )}
    </>
  )
}
