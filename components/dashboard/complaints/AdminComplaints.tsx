import Link from 'next/link'
import { ArrowLeft, MessageSquareWarning } from 'lucide-react'
import { COMPLAINT_LABEL, COMPLAINT_LIST_LIMIT, COMPLAINT_STATUSES, isComplaintStatus } from '@/lib/complaints/constants'
import { fetchComplaintDetail, fetchComplaints } from '@/lib/complaints/data'
import { ComplaintPill, UpdateComplaintForm } from './ComplaintParts'

const INPUT = 'w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-ink-400'
const LABEL = 'block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5'
const ISO = /^\d{4}-\d{2}-\d{2}$/
const day = (iso: string) => iso.slice(0, 10)

// Shared by the Super Admin and Admissions Admin portals (both are "the administration").
export async function AdminComplaintsList({ basePath, searchParams }: { basePath: string; searchParams: { status?: string; from?: string; to?: string; q?: string } }) {
  const status = searchParams.status && isComplaintStatus(searchParams.status) ? searchParams.status : null
  const from = searchParams.from && ISO.test(searchParams.from) ? searchParams.from : ''
  const to = searchParams.to && ISO.test(searchParams.to) ? searchParams.to : ''
  const q = (searchParams.q ?? '').slice(0, 100)
  const rows = await fetchComplaints({ status, from, to, q })

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><MessageSquareWarning size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Complaints</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Every complaint parents have submitted, with the action taken and its status.</p>
        </div>
      </div>

      <form method="get" className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div><label className={LABEL} htmlFor="k-status">Status</label>
          <select id="k-status" name="status" defaultValue={status ?? ''} className={INPUT}><option value="">Every status</option>{COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{COMPLAINT_LABEL[s]}</option>)}</select></div>
        <div><label className={LABEL} htmlFor="k-from">Submitted from</label><input id="k-from" name="from" type="date" defaultValue={from} className={`${INPUT} font-mono`} /></div>
        <div><label className={LABEL} htmlFor="k-to">To</label><input id="k-to" name="to" type="date" defaultValue={to} className={`${INPUT} font-mono`} /></div>
        <div><label className={LABEL} htmlFor="k-q">Find</label><input id="k-q" name="q" defaultValue={q} placeholder="Student, parent, subject, no." className={INPUT} /></div>
        <button type="submit" className="inline-flex justify-center items-center text-[12.5px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-2.5 rounded-xl">Show</button>
      </form>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <p className="px-5 py-3.5 text-[14px] font-semibold text-neutral-900 border-b border-neutral-100"><span className="font-mono">{rows.length}</span> complaint{rows.length === 1 ? '' : 's'}{rows.length >= COMPLAINT_LIST_LIMIT ? ` (latest ${COMPLAINT_LIST_LIMIT})` : ''}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead><tr className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-left">
              <th className="pl-5 px-3 py-2.5">ID</th><th className="px-3 py-2.5">Submitted</th><th className="px-3 py-2.5">Student</th><th className="px-3 py-2.5">Subject</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Action date</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="pl-5 px-3 py-3 font-mono text-[12px]"><Link href={`${basePath}/${r.id}`} className="text-ink-700 hover:text-ink-900 no-underline font-semibold">#{r.complaint_no}</Link></td>
                  <td className="px-3 py-3 font-mono text-[12px]">{day(r.submitted_at)}</td>
                  <td className="px-3 py-3"><span className="font-medium text-neutral-900">{r.student_name}</span><span className="block text-[11px] font-mono text-neutral-400">{r.student_class}{r.parent_name ? ` · ${r.parent_name}` : ''}</span></td>
                  <td className="px-3 py-3 text-neutral-700 max-w-[280px] truncate">{r.subject}</td>
                  <td className="px-3 py-3"><ComplaintPill status={r.status} /></td>
                  <td className="px-3 py-3 font-mono text-[12px] text-neutral-500">{r.action_date ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-neutral-400">No complaints match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export async function AdminComplaintDetail({ basePath, id }: { basePath: string; id: string }) {
  const detail = await fetchComplaintDetail(id)
  if (!detail) return <p className="text-[13px] text-neutral-500">Complaint not found.</p>
  const { complaint: c, history } = detail

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 no-underline mb-4"><ArrowLeft size={13} /> Complaints</Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Complaint <span className="font-mono">#{c.complaint_no}</span></h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{c.student_name} · <span className="font-mono">{c.student_class}</span> · submitted <span className="font-mono">{day(c.submitted_at)}</span>{c.parent_name ? ` by ${c.parent_name}` : ''}{c.parent_phone ? ` · ${c.parent_phone}` : ''}</p>
          </div>
          <ComplaintPill status={c.status} />
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
        <h2 className="text-[15px] font-bold text-neutral-900">{c.subject}</h2>
        <p className="mt-2 text-[13.5px] text-neutral-700 whitespace-pre-wrap">{c.details}</p>
      </section>

      <UpdateComplaintForm id={c.id} status={c.status} actionTaken={c.action_taken} response={c.response} actionDate={c.action_date} />

      <section className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
        <h2 className="text-[14px] font-semibold text-neutral-900 mb-3">History</h2>
        <ol className="space-y-3">
          {history.map((e) => (
            <li key={e.id} className="border-l-2 border-ink-200 pl-3.5">
              <p className="text-[12px] text-neutral-500"><span className="font-mono">{e.created_at.slice(0, 16).replace('T', ' ')}</span> · <ComplaintPill status={e.status} />{e.actor_name ? ` · ${e.actor_name}` : ''}</p>
              {e.action_taken && <p className="text-[13px] text-neutral-700 mt-1"><span className="font-semibold">Action:</span> {e.action_taken}</p>}
              {e.response && <p className="text-[13px] text-neutral-700 mt-1"><span className="font-semibold">Response:</span> {e.response}</p>}
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
