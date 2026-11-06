'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HandCoins, Plus } from 'lucide-react'
import { recordExpenseAction, voidExpenseAction } from '@/lib/actions/expenses'
import { FEE_METHODS, METHOD_LABEL, formatRs, type FeeMethod } from '@/lib/fees/constants'
import { EXPENSE_LIST_LIMIT } from '@/lib/finance/constants'
import type { ExpenseHead, ExpenseRow } from '@/lib/finance/ledger'
import { BTN_GHOST, BTN_PRIMARY, Dialog, INPUT, LABEL, TH } from '@/components/dashboard/fees/FeeParts'

type Props = { from: string; to: string; headId: string; q: string; heads: ExpenseHead[]; expenses: ExpenseRow[]; total: number; count: number }

export default function SuperAdminExpensesContent({ from, to, headId, q, heads, expenses, total, count }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ from, to, headId, q })
  const [recording, setRecording] = useState(false)
  const [voiding, setVoiding] = useState<ExpenseRow | null>(null)

  const [headName, setHeadName] = useState('')
  const [payee, setPayee] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [spentOn, setSpentOn] = useState(today)
  const [method, setMethod] = useState<FeeMethod>('cash')
  const [reference, setReference] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function apply(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams({ from: f.from, to: f.to })
    if (f.headId) p.set('head', f.headId)
    if (f.q.trim()) p.set('q', f.q.trim())
    router.push(`/super-admin/expenses?${p.toString()}`)
  }

  async function record(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const outcome = await recordExpenseAction({ headName, payee, description, amount: Number(amount), spentOn, method, reference })
    setBusy(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setRecording(false); setHeadName(''); setPayee(''); setDescription(''); setAmount(''); setReference('')
    router.refresh()
  }

  async function doVoid(e: React.FormEvent) {
    e.preventDefault()
    if (!voiding) return
    setBusy(true); setError(null)
    const outcome = await voidExpenseAction({ expenseId: voiding.id, reason })
    setBusy(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setVoiding(null); setReason('')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><HandCoins size={18} className="text-ink-600" /></div>
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Expenses</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">What the academy paid out, and who to. Type a new head straight into the form — it is kept for next time.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/super-admin/expenses/reports" className={`${BTN_GHOST} no-underline`}>Expense reports</Link>
          <button onClick={() => { setError(null); setRecording(true) }} className={BTN_PRIMARY}><Plus size={14} /> Record an expense</button>
        </div>
      </div>

      <form onSubmit={apply} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div><label className={LABEL} htmlFor="x-from">From</label><input id="x-from" type="date" className={`${INPUT} font-mono`} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} required /></div>
        <div><label className={LABEL} htmlFor="x-to">To</label><input id="x-to" type="date" className={`${INPUT} font-mono`} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} required /></div>
        <div>
          <label className={LABEL} htmlFor="x-head">Head</label>
          <select id="x-head" className={INPUT} value={f.headId} onChange={(e) => setF({ ...f, headId: e.target.value })}>
            <option value="">Every head</option>
            {heads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div><label className={LABEL} htmlFor="x-q">Find</label><input id="x-q" className={INPUT} placeholder="Payee or narration" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <button type="submit" className={`${BTN_PRIMARY} justify-center`}>Show</button>
      </form>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-[14px] font-semibold text-neutral-900"><span className="font-mono">{count}</span> expense{count === 1 ? '' : 's'} · <span className="font-mono">{formatRs(total)}</span>{q ? <span className="text-neutral-400 font-normal"> before the search filter</span> : null}</p>
          {expenses.length >= EXPENSE_LIST_LIMIT && <p className="text-[12px] text-warning mt-1">Showing the latest {EXPENSE_LIST_LIMIT}. Narrow the dates to see the rest; the total above counts everything in the range.</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[700px]">
            <thead><tr className="bg-neutral-50"><th className={`${TH} pl-5`}>No.</th><th className={TH}>Date</th><th className={TH}>Head</th><th className={TH}>Paid to</th><th className={TH}>Narration</th><th className={`${TH} text-right`}>Amount</th><th className={TH} /></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {expenses.map((x) => (
                <tr key={x.id} className={x.voided_at ? 'bg-neutral-50 text-neutral-400' : 'hover:bg-neutral-50'}>
                  <td className="pl-5 pr-3 py-3 font-mono text-[12px]">#{x.expense_no}</td>
                  <td className="px-3 py-3 font-mono text-[12px]">{x.spent_on}</td>
                  <td className="px-3 py-3 text-[12.5px]">{x.head_name}</td>
                  <td className="px-3 py-3 text-[12.5px] font-medium">{x.payee}<span className="block text-[11px] font-normal text-neutral-400">{METHOD_LABEL[x.method]}{x.reference ? ` · ${x.reference}` : ''}</span></td>
                  <td className="px-3 py-3 text-[12.5px] text-neutral-600">{x.description ?? '—'}</td>
                  <td className={`px-3 py-3 font-mono text-[12px] text-right font-semibold ${x.voided_at ? 'line-through' : 'text-neutral-900'}`}>{formatRs(x.amount)}</td>
                  <td className="px-3 py-3 text-right">
                    {x.voided_at ? <span className="text-[11px] font-semibold text-danger" title={x.void_reason ?? ''}>Void</span>
                      : <button onClick={() => { setError(null); setReason(''); setVoiding(x) }} className="text-[11.5px] font-medium text-neutral-500 hover:text-danger">Void</button>}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-neutral-400">No expenses in this range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {recording && (
        <Dialog title="Record an expense" onClose={() => setRecording(false)}>
          <form onSubmit={record} className="space-y-3.5">
            <div>
              <label className={LABEL} htmlFor="r-head">Head</label>
              <input id="r-head" list="expense-heads" className={INPUT} value={headName} maxLength={60} onChange={(e) => setHeadName(e.target.value)} placeholder="Pick one, or type a new head" required />
              <datalist id="expense-heads">{heads.filter((h) => h.is_active).map((h) => <option key={h.id} value={h.name} />)}</datalist>
            </div>
            <div><label className={LABEL} htmlFor="r-payee">Paid to</label><input id="r-payee" className={INPUT} value={payee} maxLength={120} onChange={(e) => setPayee(e.target.value)} required /></div>
            <div><label className={LABEL} htmlFor="r-desc">Narration (optional)</label><input id="r-desc" className={INPUT} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={LABEL} htmlFor="r-amount">Amount (Rs)</label><input id="r-amount" type="number" min="0.01" step="0.01" className={`${INPUT} font-mono`} value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
              <div><label className={LABEL} htmlFor="r-date">Date</label><input id="r-date" type="date" max={today} className={`${INPUT} font-mono`} value={spentOn} onChange={(e) => setSpentOn(e.target.value)} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL} htmlFor="r-method">Method</label>
                <select id="r-method" className={INPUT} value={method} onChange={(e) => setMethod(e.target.value as FeeMethod)}>{FEE_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select>
              </div>
              <div><label className={LABEL} htmlFor="r-ref">Reference</label><input id="r-ref" className={INPUT} value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} /></div>
            </div>
            {error && <p className="text-[12.5px] text-danger bg-danger-bg rounded-lg px-3 py-2" role="alert">{error}</p>}
            <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setRecording(false)} className={BTN_GHOST}>Cancel</button><button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Record expense'}</button></div>
          </form>
        </Dialog>
      )}

      {voiding && (
        <Dialog title={`Void expense #${voiding.expense_no}`} onClose={() => setVoiding(null)}>
          <p className="text-[12.5px] text-neutral-500 mb-4">{voiding.payee} · {formatRs(voiding.amount)}. It stays on record, marked void, and drops out of every total.</p>
          <form onSubmit={doVoid} className="space-y-3.5">
            <div><label className={LABEL} htmlFor="v-reason">Reason</label><input id="v-reason" className={INPUT} value={reason} minLength={3} maxLength={300} onChange={(e) => setReason(e.target.value)} required /></div>
            {error && <p className="text-[12.5px] text-danger bg-danger-bg rounded-lg px-3 py-2" role="alert">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setVoiding(null)} className={BTN_GHOST}>Cancel</button><button type="submit" disabled={busy} className="inline-flex items-center text-[12.5px] font-semibold text-white bg-danger hover:opacity-90 px-3.5 py-2 rounded-xl disabled:opacity-60">{busy ? 'Voiding…' : 'Void expense'}</button></div>
          </form>
        </Dialog>
      )}
    </>
  )
}
