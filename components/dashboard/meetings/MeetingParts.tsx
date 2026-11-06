'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addSlotsAction, bookSlotAction, cancelBookingAction, deleteMeetingAction, deleteSlotAction, saveMeetingAction } from '@/lib/actions/meetings'

const INPUT = 'w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10'
const LABEL = 'block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5'
const BTN = 'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-60'
const GHOST = 'inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-700 bg-ink-50 hover:bg-ink-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50'

type Note = { tone: 'ok' | 'error'; text: string }
const NoteLine = ({ note }: { note: Note | null }) => note ? <p className={`text-[12.5px] rounded-lg px-3 py-2 ${note.tone === 'ok' ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`} role={note.tone === 'error' ? 'alert' : 'status'}>{note.text}</p> : null

export function MeetingForm({ basePath, meeting }: { basePath: string; meeting?: { id: string; title: string; meeting_date: string; briefing: string | null; is_published: boolean } }) {
  const router = useRouter()
  const [title, setTitle] = useState(meeting?.title ?? '')
  const [date, setDate] = useState(meeting?.meeting_date ?? '')
  const [briefing, setBriefing] = useState(meeting?.briefing ?? '')
  const [published, setPublished] = useState(meeting?.is_published ?? false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setNote(null)
    const r = await saveMeetingAction({ id: meeting?.id, title, meetingDate: date, briefing, isPublished: published })
    setBusy(false)
    if (!r.ok) { setNote({ tone: 'error', text: r.error }); return }
    if (!meeting) { router.push(`${basePath}/${r.id}`); return }
    setNote({ tone: 'ok', text: published ? 'Saved. Parents can see this meeting.' : 'Saved as a draft.' })
    router.refresh()
  }

  async function remove() {
    if (!meeting || !window.confirm('Delete this meeting, its slots and every booking?')) return
    const r = await deleteMeetingAction({ id: meeting.id })
    if (!r.ok) { setNote({ tone: 'error', text: r.error }); return }
    router.push(basePath)
  }

  return (
    <form onSubmit={save} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-3.5">
      <h2 className="text-[14px] font-semibold text-neutral-900">{meeting ? 'Meeting briefing' : 'New meeting'}</h2>
      <div className="grid sm:grid-cols-[1fr_180px] gap-3">
        <div><label className={LABEL} htmlFor="m-title">Title</label><input id="m-title" className={INPUT} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div><label className={LABEL} htmlFor="m-date">Date</label><input id="m-date" type="date" className={`${INPUT} font-mono`} value={date} onChange={(e) => setDate(e.target.value)} required /></div>
      </div>
      <div><label className={LABEL} htmlFor="m-brief">Briefing for parents</label><textarea id="m-brief" className={`${INPUT} min-h-[110px]`} value={briefing} maxLength={4000} onChange={(e) => setBriefing(e.target.value)} placeholder="What the meeting is about, what to bring, where to come…" /></div>
      <label className="flex items-center gap-2 text-[13px] text-neutral-700"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published — parents can see this meeting and book slots</label>
      <NoteLine note={note} />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className={BTN}>{busy ? 'Saving…' : meeting ? 'Save' : 'Create meeting'}</button>
        {meeting && <button type="button" onClick={remove} className="text-[12px] font-semibold text-danger hover:opacity-80 ml-auto">Delete meeting</button>}
      </div>
    </form>
  )
}

export function AddSlotsForm({ meetingId, date }: { meetingId: string; date: string }) {
  const router = useRouter()
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('12:00')
  const [minutes, setMinutes] = useState('10')
  const [withWhom, setWithWhom] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setNote(null)
    const r = await addSlotsAction({ meetingId, date, start, end, minutes: Number(minutes), withWhom })
    setBusy(false)
    if (!r.ok) { setNote({ tone: 'error', text: r.error }); return }
    setNote({ tone: 'ok', text: `Added ${r.created} slot${r.created === 1 ? '' : 's'}.` })
    router.refresh()
  }

  return (
    <form onSubmit={add} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-3.5">
      <h2 className="text-[14px] font-semibold text-neutral-900">Add time slots</h2>
      <p className="text-[12.5px] text-neutral-500">The range is cut into equal slots on the meeting date. Times are Pakistan time.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><label className={LABEL} htmlFor="s-start">From</label><input id="s-start" type="time" className={`${INPUT} font-mono`} value={start} onChange={(e) => setStart(e.target.value)} required /></div>
        <div><label className={LABEL} htmlFor="s-end">Until</label><input id="s-end" type="time" className={`${INPUT} font-mono`} value={end} onChange={(e) => setEnd(e.target.value)} required /></div>
        <div><label className={LABEL} htmlFor="s-min">Minutes each</label><input id="s-min" type="number" min={5} max={120} className={`${INPUT} font-mono`} value={minutes} onChange={(e) => setMinutes(e.target.value)} required /></div>
        <div><label className={LABEL} htmlFor="s-who">With (optional)</label><input id="s-who" className={INPUT} value={withWhom} maxLength={80} onChange={(e) => setWithWhom(e.target.value)} placeholder="Teacher / coordinator" /></div>
      </div>
      <NoteLine note={note} />
      <button type="submit" disabled={busy} className={BTN}>{busy ? 'Adding…' : 'Add slots'}</button>
    </form>
  )
}

export function SlotActions({ slotId, bookingId }: { slotId: string; bookingId: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function run(fn: () => Promise<{ ok: boolean }>) { setBusy(true); await fn(); setBusy(false); router.refresh() }
  return (
    <span className="inline-flex gap-2">
      {bookingId && <button disabled={busy} onClick={() => run(() => cancelBookingAction({ id: bookingId }))} className={GHOST}>Cancel booking</button>}
      <button disabled={busy} onClick={() => { if (!bookingId || window.confirm('This slot is booked. Remove it and its booking?')) void run(() => deleteSlotAction({ id: slotId })) }} className="text-[12px] font-semibold text-danger hover:opacity-80 disabled:opacity-50">Remove</button>
    </span>
  )
}

export type ParentSlot = { id: string; label: string; with_whom: string | null; taken: boolean }
export type ParentMeetingView = {
  id: string; title: string; dateLabel: string; briefing: string | null; slots: ParentSlot[]
  kids: { id: string; name: string; booking: { id: string; slotLabel: string } | null }[]
}

// Parent: book (or cancel) one slot per child.
export function ParentBooking({ meeting }: { meeting: ParentMeetingView }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note | null>(null)

  async function book(slotId: string, studentId: string) {
    setBusy(true); setNote(null)
    const r = await bookSlotAction({ slotId, studentId })
    setBusy(false)
    setNote(r.ok ? { tone: 'ok', text: 'Booked. See you then.' } : { tone: 'error', text: r.error })
    router.refresh()
  }
  async function cancel(id: string) {
    setBusy(true); setNote(null)
    const r = await cancelBookingAction({ id })
    setBusy(false)
    setNote(r.ok ? { tone: 'ok', text: 'Booking cancelled.' } : { tone: 'error', text: r.error })
    router.refresh()
  }

  return (
    <article className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-4">
      <div>
        <h2 className="text-[16px] font-bold text-neutral-900">{meeting.title}</h2>
        <p className="text-[12.5px] text-neutral-500">{meeting.dateLabel}</p>
        {meeting.briefing && <p className="mt-2 text-[13px] text-neutral-700 whitespace-pre-wrap">{meeting.briefing}</p>}
      </div>
      <NoteLine note={note} />
      {meeting.kids.map((k) => (
        <div key={k.id} className="rounded-xl border border-neutral-200 p-4 space-y-2.5">
          <p className="text-[13px] font-semibold text-neutral-900">{k.name}</p>
          {k.booking ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[13px] text-success bg-success-bg rounded-lg px-3 py-1.5">Booked: {k.booking.slotLabel}</p>
              <button disabled={busy} onClick={() => cancel(k.booking!.id)} className={GHOST}>Cancel booking</button>
            </div>
          ) : meeting.slots.length === 0 ? (
            <p className="text-[12.5px] text-neutral-500">No time slots have been set up yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {meeting.slots.map((s) => (
                <button key={s.id} disabled={busy || s.taken} onClick={() => book(s.id, k.id)} title={s.taken ? 'Already booked' : `Book ${s.label}`}
                  className={`text-[12px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors ${s.taken ? 'border-neutral-200 bg-neutral-50 text-neutral-300 line-through cursor-not-allowed' : 'border-ink-200 bg-ink-50 text-ink-700 hover:bg-ink-100'}`}>
                  {s.label}{s.with_whom ? ` · ${s.with_whom}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </article>
  )
}
