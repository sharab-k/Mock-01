'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Layers } from 'lucide-react'
import { saveFeeHeadAction } from '@/lib/actions/fees'
import { formatRs } from '@/lib/fees/constants'
import type { FeeHead } from '@/lib/fees/ledger'
import { BTN_GHOST, BTN_PRIMARY, Dialog, INPUT, LABEL, TH } from '@/components/dashboard/fees/FeeParts'

export default function SuperAdminFeeHeadsContent({ heads }: { heads: FeeHead[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Partial<FeeHead> | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [monthly, setMonthly] = useState(false)
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function open(h: Partial<FeeHead>) {
    setEditing(h); setName(h.name ?? ''); setAmount(h.default_amount != null ? String(h.default_amount) : ''); setMonthly(h.is_monthly ?? false); setActive(h.is_active ?? true); setError(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const outcome = await saveFeeHeadAction({ id: editing?.id, name, isMonthly: monthly, defaultAmount: amount.trim() === '' ? null : Number(amount), isActive: active })
    setBusy(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setEditing(null)
    router.refresh()
  }

  return (
    <>
      <div>
        <Link href="/super-admin/fees" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 no-underline mb-4"><ArrowLeft size={13} /> Fees</Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><Layers size={18} className="text-ink-600" /></div>
            <div>
              <h1 className="text-[20px] font-bold text-neutral-900">Fee heads</h1>
              <p className="text-[13px] text-neutral-500 mt-0.5">The kinds of fee the academy charges. A monthly head repeats every month.</p>
            </div>
          </div>
          <button onClick={() => open({})} className={BTN_PRIMARY}>Add fee head</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[520px]">
            <thead><tr className="bg-neutral-50"><th className={`${TH} pl-5`}>Name</th><th className={TH}>Repeats</th><th className={`${TH} text-right`}>Usual amount</th><th className={TH}>Status</th><th className={TH} /></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {heads.map((h) => (
                <tr key={h.id} className="hover:bg-neutral-50">
                  <td className="pl-5 pr-3 py-3 font-medium text-neutral-900">{h.name}</td>
                  <td className="px-3 py-3 text-neutral-600">{h.is_monthly ? 'Every month' : 'One-off'}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right text-neutral-700">{h.default_amount != null ? formatRs(h.default_amount) : '—'}</td>
                  <td className="px-3 py-3"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${h.is_active ? 'bg-success-bg text-success' : 'bg-neutral-100 text-neutral-500'}`}>{h.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-3 py-3 text-right"><button onClick={() => open(h)} className="text-[11.5px] font-medium text-ink-600 hover:text-ink-800">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Dialog title={editing.id ? 'Edit fee head' : 'Add fee head'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3.5">
            <div><label className={LABEL} htmlFor="h-name">Name</label><input id="h-name" className={INPUT} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required /></div>
            <div><label className={LABEL} htmlFor="h-amount">Usual amount (Rs, optional)</label><input id="h-amount" className={`${INPUT} font-mono`} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-[13px] text-neutral-700"><input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} /> Repeats every month</label>
            <label className="flex items-center gap-2 text-[13px] text-neutral-700"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
            {error && <p className="text-[12.5px] text-danger bg-danger-bg rounded-lg px-3 py-2" role="alert">{error}</p>}
            <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setEditing(null)} className={BTN_GHOST}>Cancel</button><button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save'}</button></div>
          </form>
        </Dialog>
      )}
    </>
  )
}
