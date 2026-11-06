import { Wallet } from 'lucide-react'
import { Download } from 'lucide-react'
import { METHOD_LABEL, formatRs, monthLabel } from '@/lib/fees/constants'
import { fetchMyChildrenFees } from '@/lib/fees/parent'
import { StatusPill } from '@/components/dashboard/fees/FeeParts'

const TH = 'px-3 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-left'

export default async function ParentFeesPage() {
  const children = await fetchMyChildrenFees()

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><Wallet size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Fees</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">What is due, what has been paid, and your receipts</p>
        </div>
      </div>

      {children.length === 0 && <p className="text-[13px] text-neutral-500 bg-white rounded-2xl border border-neutral-200 p-6">No children are linked to this account yet.</p>}

      {children.map((c) => (
        <section key={c.id} className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-[15px] font-bold text-neutral-900">{c.full_name}</h2>
              <p className="text-[12px] font-mono text-neutral-400">{c.roll_number} · {c.grade}{c.section}</p>
            </div>
            <p className="text-[13px] text-neutral-600">Outstanding <span className={`font-mono font-bold ${c.outstanding > 0 ? 'text-warning' : 'text-success'}`}>{formatRs(c.outstanding)}</span></p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[480px]">
              <thead><tr className="bg-neutral-50"><th className={`${TH} pl-5`}>Fee</th><th className={TH}>Due date</th><th className={`${TH} text-right`}>Due</th><th className={`${TH} text-right`}>Paid</th><th className={TH}>Status</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {c.charges.map((ch) => (
                  <tr key={ch.charge_id}>
                    <td className="pl-5 pr-3 py-3"><span className="font-medium text-neutral-900">{ch.head_name}</span><span className="block text-[11.5px] text-neutral-400">{monthLabel(ch.year, ch.month)}</span></td>
                    <td className="px-3 py-3 font-mono text-[12px] text-neutral-600">{ch.due_date ?? '—'}</td>
                    <td className="px-3 py-3 font-mono text-[12px] text-right">{formatRs(ch.due)}</td>
                    <td className="px-3 py-3 font-mono text-[12px] text-right">{formatRs(ch.paid)}</td>
                    <td className="px-3 py-3"><StatusPill status={ch.status} /></td>
                  </tr>
                ))}
                {c.charges.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-[13px] text-neutral-400">No fees have been charged yet.</td></tr>}
              </tbody>
            </table>
          </div>

          {c.vouchers.length > 0 && (
            <div className="border-t border-neutral-100 px-5 py-3.5">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Fee vouchers</p>
              <ul className="space-y-2">
                {c.vouchers.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 text-[12.5px] flex-wrap">
                    <span className="text-neutral-700"><span className="font-mono text-neutral-400">#{v.voucher_no}</span> · {monthLabel(v.year, v.month)} · due <span className="font-mono">{v.due_date}</span></span>
                    <span className="flex items-center gap-3">
                      <StatusPill status={v.status} />
                      <a href={`/api/vouchers/pdf?id=${v.id}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-700 hover:text-ink-900 no-underline"><Download size={13} /> Download</a>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.receipts.length > 0 && (
            <div className="border-t border-neutral-100 px-5 py-3.5">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Receipts</p>
              <ul className="space-y-1.5">
                {c.receipts.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="text-neutral-700"><span className="font-mono text-neutral-400">#{r.receipt_no}</span> · <span className="font-mono">{r.paid_on}</span> · {METHOD_LABEL[r.method]}</span>
                    <span className="font-mono font-semibold text-neutral-900">{formatRs(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}
    </>
  )
}
