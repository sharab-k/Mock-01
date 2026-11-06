'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Receipt } from 'lucide-react'
import { FEE_METHODS, METHOD_LABEL, PAYMENT_LIST_LIMIT, formatRs, type FeeMethod } from '@/lib/fees/constants'
import type { PaymentRow } from '@/lib/fees/ledger'
import { BTN_PRIMARY, INPUT, LABEL, TH, VoidReceiptDialog, type VoidTarget } from '@/components/dashboard/fees/FeeParts'

type Props = {
  from: string
  to: string
  method: FeeMethod | ''
  q: string
  payments: PaymentRow[]
  collected: number
  receiptCount: number
}

export default function SuperAdminFeePaymentsContent({ from, to, method, q, payments, collected, receiptCount }: Props) {
  const router = useRouter()
  const [f, setF] = useState({ from, to, method, q })
  const [voiding, setVoiding] = useState<VoidTarget | null>(null)

  function apply(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams({ from: f.from, to: f.to })
    if (f.method) p.set('method', f.method)
    if (f.q.trim()) p.set('q', f.q.trim())
    router.push(`/super-admin/fees/payments?${p.toString()}`)
  }

  return (
    <>
      <div>
        <Link href="/super-admin/fees" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 no-underline mb-4"><ArrowLeft size={13} /> Fees</Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><Receipt size={18} className="text-ink-600" /></div>
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Payments</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">Every fee receipt, newest first. Voided receipts stay on record.</p>
          </div>
        </div>
      </div>

      <form onSubmit={apply} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div><label className={LABEL} htmlFor="f-from">From</label><input id="f-from" type="date" className={`${INPUT} font-mono`} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} required /></div>
        <div><label className={LABEL} htmlFor="f-to">To</label><input id="f-to" type="date" className={`${INPUT} font-mono`} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} required /></div>
        <div>
          <label className={LABEL} htmlFor="f-method">Method</label>
          <select id="f-method" className={INPUT} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as FeeMethod | '' })}>
            <option value="">Every method</option>
            {FEE_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
          </select>
        </div>
        <div><label className={LABEL} htmlFor="f-q">Find</label><input id="f-q" className={INPUT} placeholder="Name, roll, GR, receipt no." value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <button type="submit" className={`${BTN_PRIMARY} justify-center`}>Show</button>
      </form>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-[14px] font-semibold text-neutral-900"><span className="font-mono">{receiptCount}</span> receipt{receiptCount === 1 ? '' : 's'} · <span className="font-mono">{formatRs(collected)}</span> collected{(method || q) ? <span className="text-neutral-400 font-normal"> in this date range, before the method / search filter</span> : null}</p>
          {payments.length >= PAYMENT_LIST_LIMIT && <p className="text-[12px] text-warning mt-1">Showing the latest {PAYMENT_LIST_LIMIT}. Narrow the dates to see the rest; the totals above count every receipt in the range.</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[780px]">
            <thead><tr className="bg-neutral-50">
              <th className={`${TH} pl-5`}>Receipt</th><th className={TH}>Date</th><th className={TH}>Student</th><th className={TH}>Class</th><th className={TH}>For</th>
              <th className={TH}>Method</th><th className={`${TH} text-right`}>Amount</th><th className={TH} />
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {payments.map((p) => (
                <tr key={p.id} className={p.voided_at ? 'bg-neutral-50 text-neutral-400' : 'hover:bg-neutral-50'}>
                  <td className="pl-5 pr-3 py-3 font-mono text-[12px]">#{p.receipt_no}</td>
                  <td className="px-3 py-3 font-mono text-[12px]">{p.paid_on}</td>
                  <td className="px-3 py-3">
                    <Link href={`/super-admin/fees/student/${p.student_id}`} className="font-medium text-neutral-900 hover:text-ink-700 no-underline">{p.student.full_name}</Link>
                    <span className="block text-[11px] font-mono text-neutral-400">{p.student.roll_number}{p.student.gr_number ? ` · GR ${p.student.gr_number}` : ''}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px]">{p.student.grade}{p.student.section}</td>
                  <td className="px-3 py-3 text-[12.5px]">{p.head_name}</td>
                  <td className="px-3 py-3 text-[12.5px]">{METHOD_LABEL[p.method]}{p.reference ? <span className="block text-[11px] font-mono text-neutral-400">{p.reference}</span> : null}</td>
                  <td className={`px-3 py-3 font-mono text-[12px] text-right font-semibold ${p.voided_at ? 'line-through' : 'text-neutral-900'}`}>{formatRs(p.amount)}</td>
                  <td className="px-3 py-3 text-right">
                    {p.voided_at
                      ? <span className="text-[11px] font-semibold text-danger" title={p.void_reason ?? ''}>Void</span>
                      : <button onClick={() => setVoiding({ receiptId: p.id, studentName: p.student.full_name, receiptNo: p.receipt_no, amount: p.amount })} className="text-[11.5px] font-medium text-neutral-500 hover:text-danger">Void</button>}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] text-neutral-400">No payments in this range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {voiding && <VoidReceiptDialog target={voiding} onClose={() => setVoiding(null)} />}
    </>
  )
}
