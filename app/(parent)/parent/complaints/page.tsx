import { MessageSquareWarning } from 'lucide-react'
import { ComplaintPill, NewComplaintForm } from '@/components/dashboard/complaints/ComplaintParts'
import { fetchMyComplaints } from '@/lib/complaints/data'
import { fetchParentChildren } from '@/lib/parent/dashboard-data'

export default async function ParentComplaintsPage() {
  const [complaints, kids] = await Promise.all([fetchMyComplaints(), fetchParentChildren()])

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><MessageSquareWarning size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Complaints</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Tell the academy about a concern, and follow what was done about it.</p>
        </div>
      </div>

      <NewComplaintForm kids={kids.map((k) => ({ id: k.id, name: k.name }))} />

      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-neutral-900">Your complaints</h2>
        {complaints.length === 0 && <p className="text-[13px] text-neutral-500 bg-white rounded-2xl border border-neutral-200 p-5">You have not submitted any complaints.</p>}
        {complaints.map((c) => (
          <article key={c.id} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-[14px] font-bold text-neutral-900">{c.subject}</h3>
                <p className="text-[12px] text-neutral-500"><span className="font-mono">#{c.complaint_no}</span> · {c.student_name} · submitted <span className="font-mono">{c.submitted_at.slice(0, 10)}</span></p>
              </div>
              <ComplaintPill status={c.status} />
            </div>
            <p className="text-[13px] text-neutral-700 whitespace-pre-wrap">{c.details}</p>
            {(c.action_taken || c.response) && (
              <div className="rounded-xl bg-ink-50 px-4 py-3 text-[13px] text-ink-800 space-y-1">
                {c.action_taken && <p><span className="font-semibold">Action taken:</span> {c.action_taken}</p>}
                {c.response && <p><span className="font-semibold">Response:</span> {c.response}</p>}
                {c.action_date && <p className="text-[12px] text-ink-600">On <span className="font-mono">{c.action_date}</span></p>}
              </div>
            )}
          </article>
        ))}
      </section>
    </>
  )
}
