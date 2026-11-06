'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitComplaintAction, updateComplaintAction } from '@/lib/actions/complaints'
import { COMPLAINT_LABEL, COMPLAINT_PILL, COMPLAINT_STATUSES, type ComplaintStatus } from '@/lib/complaints/constants'

const INPUT = 'w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10'
const LABEL = 'block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5'
const BTN = 'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-60'

export function ComplaintPill({ status }: { status: ComplaintStatus }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${COMPLAINT_PILL[status]}`}>{COMPLAINT_LABEL[status]}</span>
}

// Parent: file a complaint for one of their own children.
export function NewComplaintForm({ kids }: { kids: { id: string; name: string }[] }) {
  const router = useRouter()
  const [studentId, setStudentId] = useState(kids[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const outcome = await submitComplaintAction({ studentId, subject, details })
    setBusy(false)
    if (!outcome.ok) { setMsg({ tone: 'error', text: outcome.error }); return }
    setSubject(''); setDetails('')
    setMsg({ tone: 'ok', text: `Complaint #${outcome.complaintNo} submitted. You can follow its status below.` })
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-3.5">
      <h2 className="text-[14px] font-semibold text-neutral-900">Submit a complaint</h2>
      {kids.length > 1 && (
        <div>
          <label className={LABEL} htmlFor="c-child">About which child</label>
          <select id="c-child" className={INPUT} value={studentId} onChange={(e) => setStudentId(e.target.value)}>{kids.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
      )}
      <div><label className={LABEL} htmlFor="c-subject">Subject</label><input id="c-subject" className={INPUT} value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} required /></div>
      <div><label className={LABEL} htmlFor="c-details">Details</label><textarea id="c-details" className={`${INPUT} min-h-[110px]`} value={details} maxLength={2000} onChange={(e) => setDetails(e.target.value)} required /></div>
      {msg && <p className={`text-[12.5px] rounded-lg px-3 py-2 ${msg.tone === 'ok' ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`} role={msg.tone === 'error' ? 'alert' : 'status'}>{msg.text}</p>}
      <button type="submit" disabled={busy || !studentId} className={BTN}>{busy ? 'Submitting…' : 'Submit complaint'}</button>
    </form>
  )
}

// Administration: record the action taken, the response, the date and the status.
export function UpdateComplaintForm({ id, status, actionTaken, response, actionDate }: { id: string; status: ComplaintStatus; actionTaken: string | null; response: string | null; actionDate: string | null }) {
  const router = useRouter()
  const [st, setSt] = useState<ComplaintStatus>(status)
  const [action, setAction] = useState(actionTaken ?? '')
  const [resp, setResp] = useState(response ?? '')
  const [date, setDate] = useState(actionDate ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const outcome = await updateComplaintAction({ id, status: st, actionTaken: action, response: resp, actionDate: date || null })
    setBusy(false)
    if (!outcome.ok) { setMsg({ tone: 'error', text: outcome.error }); return }
    setMsg({ tone: 'ok', text: 'Saved. The parent can see the update.' })
    router.refresh()
  }

  return (
    <form onSubmit={save} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-3.5">
      <h2 className="text-[14px] font-semibold text-neutral-900">Action and response</h2>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={LABEL} htmlFor="u-status">Status</label><select id="u-status" className={INPUT} value={st} onChange={(e) => setSt(e.target.value as ComplaintStatus)}>{COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{COMPLAINT_LABEL[s]}</option>)}</select></div>
        <div><label className={LABEL} htmlFor="u-date">Action / resolution date</label><input id="u-date" type="date" max={today} className={`${INPUT} font-mono`} value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div><label className={LABEL} htmlFor="u-action">Action taken</label><textarea id="u-action" className={`${INPUT} min-h-[80px]`} value={action} maxLength={2000} onChange={(e) => setAction(e.target.value)} /></div>
      <div><label className={LABEL} htmlFor="u-resp">Response to the parent</label><textarea id="u-resp" className={`${INPUT} min-h-[80px]`} value={resp} maxLength={2000} onChange={(e) => setResp(e.target.value)} /></div>
      {msg && <p className={`text-[12.5px] rounded-lg px-3 py-2 ${msg.tone === 'ok' ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`} role={msg.tone === 'error' ? 'alert' : 'status'}>{msg.text}</p>}
      <button type="submit" disabled={busy} className={BTN}>{busy ? 'Saving…' : 'Save update'}</button>
    </form>
  )
}
