'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { addChargeAction } from '@/lib/actions/fees'
import { METHOD_LABEL, MONTH_NAMES, formatRs, monthLabel } from '@/lib/fees/constants'
import type { ChargeBalance, FeeHead, Receipt, StudentRef } from '@/lib/fees/ledger'
import { BTN_GHOST, BTN_PRIMARY, Dialog, INPUT, LABEL, RecordPaymentDialog, StatusPill, TH, VoidReceiptDialog, type PayTarget, type VoidTarget } from '@/components/dashboard/fees/FeeParts'

type Props = { student: StudentRef; heads: FeeHead[]; charges: ChargeBalance[]; receipts: Receipt[] }

export default function SuperAdminStudentLedgerContent({ student, heads, charges, receipts }: Props) {
  const router = useRouter()
  const now = new Date()
  const [pay, setPay] = useState<PayTarget | null>(null)
  const [voiding, setVoiding] = useState<VoidTarget | null>(null)
  const [adding, setAdding] = useState(false)

  const [headId, setHeadId] = useState(heads.find((h) => h.is_active)?.id ?? '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | ''>(now.getMonth() + 1)
  const [amount, setAmount] = useState('')
  const [discount, setDiscount] = useState('0')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalDue = charges.reduce((n, c) => n + c.due, 0)
  const totalPaid = charges.reduce((n, c) => n + c.paid, 0)
  const totalOutstanding = charges.reduce((n, c) => n + c.outstanding, 0)
  const chargeLabel = new Map(charges.map((c) => [c.charge_id, `${c.head_name} · ${monthLabel(c.year, c.month)}`]))

  function openAdd() {
    const head = heads.find((h) => h.id === headId)
    setAmount(String(head?.is_monthly ? (student.tuition_fee ?? '') : (head?.default_amount ?? '')))
    setDiscount(head?.is_monthly ? String(student.monthly_discount) : '0')
    setError(null); setAdding(true)
  }

  function onHead(id: string) {
    setHeadId(id)
    const head = heads.find((h) => h.id === id)
    setAmount(String(head?.is_monthly ? (student.tuition_fee ?? '') : (head?.default_amount ?? '')))
    setDiscount(head?.is_monthly ? String(student.monthly_discount) : '0')
    if (head && !head.is_monthly) setMonth('')
    else if (month === '') setMonth(now.getMonth() + 1)
  }

  async function addCharge(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const outcome = await addChargeAction({
      studentId: student.id, studentName: student.full_name, headId, year, month: month === '' ? null : month,
      amount: Number(amount), discount: Number(discount || 0), dueDate: dueDate || null, note,
    })
    setBusy(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setAdding(false)
    router.refresh()
  }

  return (
    <>
      <div>
        <Link href="/super-admin/fees" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 no-underline mb-4"><ArrowLeft size={13} /> Fees</Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">{student.full_name}</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5 font-mono">{student.roll_number}{student.gr_number ? ` · GR ${student.gr_number}` : ''} · {student.grade}{student.section}{student.tuition_fee != null ? ` · monthly fee ${formatRs(student.tuition_fee)}` : ' · no monthly fee set'}{student.monthly_discount > 0 ? ` · discount ${formatRs(student.monthly_discount)}` : ''}</p>
          </div>
          <button onClick={openAdd} className={BTN_PRIMARY}><Plus size={14} /> Add charge</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Charged', totalDue, 'text-neutral-900'], ['Paid', totalPaid, 'text-success'], ['Outstanding', totalOutstanding, totalOutstanding > 0 ? 'text-warning' : 'text-neutral-900']].map(([label, value, tone]) => (
          <div key={label as string} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{label as string}</p>
            <p className={`mt-1 text-[18px] font-bold font-mono ${tone as string}`}>{formatRs(value as number)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <h2 className="px-5 py-3.5 text-[14px] font-semibold text-neutral-900 border-b border-neutral-100">Charges</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead><tr className="bg-neutral-50"><th className={`${TH} pl-5`}>Fee</th><th className={TH}>Due date</th><th className={`${TH} text-right`}>Due</th><th className={`${TH} text-right`}>Paid</th><th className={`${TH} text-right`}>Outstanding</th><th className={TH}>Status</th><th className={TH} /></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {charges.map((c) => (
                <tr key={c.charge_id}>
                  <td className="pl-5 pr-3 py-3"><span className="font-medium text-neutral-900">{c.head_name}</span><span className="block text-[11.5px] text-neutral-400">{monthLabel(c.year, c.month)}{c.discount > 0 ? ` · discount ${formatRs(c.discount)}` : ''}{c.note ? ` · ${c.note}` : ''}</span></td>
                  <td className="px-3 py-3 font-mono text-[12px] text-neutral-600">{c.due_date ?? '—'}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right">{formatRs(c.due)}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right">{formatRs(c.paid)}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right font-semibold">{formatRs(c.outstanding)}</td>
                  <td className="px-3 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-3 py-3 text-right">
                    {c.outstanding > 0 && <button onClick={() => setPay({ studentId: student.id, studentName: student.full_name, chargeId: c.charge_id, label: `${c.head_name} · ${monthLabel(c.year, c.month)}`, outstanding: c.outstanding })} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg text-success bg-success-bg hover:bg-success/10">Record payment</button>}
                  </td>
                </tr>
              ))}
              {charges.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-neutral-400">No charges yet. Add one, or generate the month’s charges from the Fees page.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <h2 className="px-5 py-3.5 text-[14px] font-semibold text-neutral-900 border-b border-neutral-100">Receipts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[560px]">
            <thead><tr className="bg-neutral-50"><th className={`${TH} pl-5`}>Receipt</th><th className={TH}>Date</th><th className={TH}>For</th><th className={TH}>Method</th><th className={`${TH} text-right`}>Amount</th><th className={TH} /></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {receipts.map((r) => (
                <tr key={r.id} className={r.voided_at ? 'bg-neutral-50 text-neutral-400' : ''}>
                  <td className="pl-5 pr-3 py-3 font-mono text-[12px]">#{r.receipt_no}</td>
                  <td className="px-3 py-3 font-mono text-[12px]">{r.paid_on}</td>
                  <td className="px-3 py-3 text-[12.5px]">{chargeLabel.get(r.charge_id) ?? 'Fee'}</td>
                  <td className="px-3 py-3 text-[12.5px]">{METHOD_LABEL[r.method]}{r.reference ? ` · ${r.reference}` : ''}</td>
                  <td className={`px-3 py-3 font-mono text-[12px] text-right font-semibold ${r.voided_at ? 'line-through' : ''}`}>{formatRs(r.amount)}</td>
                  <td className="px-3 py-3 text-right">
                    {r.voided_at
                      ? <span className="text-[11px] font-semibold text-danger" title={r.void_reason ?? ''}>Void{r.void_reason ? ` · ${r.void_reason}` : ''}</span>
                      : <button onClick={() => setVoiding({ receiptId: r.id, studentName: student.full_name, receiptNo: r.receipt_no, amount: r.amount })} className="text-[11.5px] font-medium text-neutral-500 hover:text-danger">Void</button>}
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-neutral-400">No payments recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {pay && <RecordPaymentDialog target={pay} onClose={() => setPay(null)} />}
      {voiding && <VoidReceiptDialog target={voiding} onClose={() => setVoiding(null)} />}

      {adding && (
        <Dialog title="Add charge" onClose={() => setAdding(false)}>
          <form onSubmit={addCharge} className="space-y-3.5">
            <div>
              <label className={LABEL} htmlFor="c-head">Fee head</label>
              <select id="c-head" className={INPUT} value={headId} onChange={(e) => onHead(e.target.value)} required>
                {heads.filter((h) => h.is_active).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL} htmlFor="c-month">Month</label>
                <select id="c-month" className={INPUT} value={month} onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">One-off (no month)</option>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div><label className={LABEL} htmlFor="c-year">Year</label><input id="c-year" className={`${INPUT} font-mono`} type="number" min={2020} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={LABEL} htmlFor="c-amount">Amount (Rs)</label><input id="c-amount" className={`${INPUT} font-mono`} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
              <div><label className={LABEL} htmlFor="c-discount">Discount (Rs)</label><input id="c-discount" className={`${INPUT} font-mono`} type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            </div>
            <div><label className={LABEL} htmlFor="c-due">Due date (optional)</label><input id="c-due" className={`${INPUT} font-mono`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div><label className={LABEL} htmlFor="c-note">Note (optional)</label><input id="c-note" className={INPUT} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            {error && <p className="text-[12.5px] text-danger bg-danger-bg rounded-lg px-3 py-2" role="alert">{error}</p>}
            <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setAdding(false)} className={BTN_GHOST}>Cancel</button><button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Adding…' : 'Add charge'}</button></div>
          </form>
        </Dialog>
      )}
    </>
  )
}
