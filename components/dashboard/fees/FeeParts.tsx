'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { recordPaymentAction, voidReceiptAction } from '@/lib/actions/fees'
import { FEE_METHODS, METHOD_LABEL, STATUS_LABEL, STATUS_PILL, formatRs, type FeeChargeStatus, type FeeMethod } from '@/lib/fees/constants'

export const INPUT = 'w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10'
export const LABEL = 'block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5'
export const BTN_PRIMARY = 'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-60'
export const BTN_GHOST = 'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700 bg-ink-50 hover:bg-ink-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-60'
export const TH = 'px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-left'

export function StatusPill({ status }: { status: FeeChargeStatus }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span>
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100" aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export type PayTarget = { studentId: string; studentName: string; chargeId: string; label: string; outstanding: number }

export function RecordPaymentDialog({ target, onClose }: { target: PayTarget; onClose: () => void }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [amount, setAmount] = useState(String(target.outstanding))
  const [paidOn, setPaidOn] = useState(today)
  const [method, setMethod] = useState<FeeMethod>('cash')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const outcome = await recordPaymentAction({
      studentId: target.studentId, studentName: target.studentName, chargeId: target.chargeId,
      amount: Number(amount), paidOn, method, reference, note,
    })
    setBusy(false)
    if (!outcome.ok) { setError(outcome.error); return }
    onClose()
    router.refresh()
  }

  return (
    <Dialog title="Record payment" onClose={onClose}>
      <p className="text-[12.5px] text-neutral-500 mb-4">{target.studentName} · {target.label} · outstanding <span className="font-mono font-semibold text-neutral-800">{formatRs(target.outstanding)}</span></p>
      <form onSubmit={submit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="pay-amount">Amount (Rs)</label>
            <input id="pay-amount" className={`${INPUT} font-mono`} type="number" min="0.01" step="0.01" max={target.outstanding} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className={LABEL} htmlFor="pay-date">Payment date</label>
            <input id="pay-date" className={`${INPUT} font-mono`} type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className={LABEL} htmlFor="pay-method">Method</label>
          <select id="pay-method" className={INPUT} value={method} onChange={(e) => setMethod(e.target.value as FeeMethod)}>
            {FEE_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="pay-ref">Reference (optional)</label>
          <input id="pay-ref" className={INPUT} maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque no., transfer ID…" />
        </div>
        <div>
          <label className={LABEL} htmlFor="pay-note">Note (optional)</label>
          <input id="pay-note" className={INPUT} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="text-[12.5px] text-danger bg-danger-bg rounded-lg px-3 py-2" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={BTN_GHOST}>Cancel</button>
          <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Record payment'}</button>
        </div>
      </form>
    </Dialog>
  )
}

export type VoidTarget = { receiptId: string; studentName: string; receiptNo: number; amount: number }

export function VoidReceiptDialog({ target, onClose }: { target: VoidTarget; onClose: () => void }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const outcome = await voidReceiptAction({ receiptId: target.receiptId, studentName: target.studentName, reason })
    setBusy(false)
    if (!outcome.ok) { setError(outcome.error); return }
    onClose()
    router.refresh()
  }

  return (
    <Dialog title={`Void receipt #${target.receiptNo}`} onClose={onClose}>
      <p className="text-[12.5px] text-neutral-500 mb-4">{target.studentName} · {formatRs(target.amount)}. The receipt stays on record, marked void, and the amount becomes outstanding again.</p>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className={LABEL} htmlFor="void-reason">Reason</label>
          <input id="void-reason" className={INPUT} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. entered twice, wrong student" required minLength={3} />
        </div>
        {error && <p className="text-[12.5px] text-danger bg-danger-bg rounded-lg px-3 py-2" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={BTN_GHOST}>Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex items-center text-[12.5px] font-semibold text-white bg-danger hover:opacity-90 px-3.5 py-2 rounded-xl disabled:opacity-60">{busy ? 'Voiding…' : 'Void receipt'}</button>
        </div>
      </form>
    </Dialog>
  )
}
