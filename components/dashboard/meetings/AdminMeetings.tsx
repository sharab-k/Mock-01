import Link from 'next/link'
import { ArrowLeft, Users2 } from 'lucide-react'
import { dateLabel, fetchMeetingBookings, fetchMeetingWithSlots, fetchMeetings, timeLabel } from '@/lib/meetings/data'
import { AddSlotsForm, MeetingForm, SlotActions } from './MeetingParts'

export async function AdminMeetingsList({ basePath }: { basePath: string }) {
  const meetings = await fetchMeetings()
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><Users2 size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Parents teacher meetings</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Set up a meeting, add time slots, and parents book their own.</p>
        </div>
      </div>

      <MeetingForm basePath={basePath} />

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-left"><th className="pl-5 px-3 py-2.5">Meeting</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Slots</th><th className="px-3 py-2.5">Booked</th><th className="px-3 py-2.5">Status</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {meetings.map((m) => (
              <tr key={m.id} className="hover:bg-neutral-50">
                <td className="pl-5 px-3 py-3"><Link href={`${basePath}/${m.id}`} className="font-medium text-ink-700 hover:text-ink-900 no-underline">{m.title}</Link></td>
                <td className="px-3 py-3 font-mono text-[12px]">{m.meeting_date}</td>
                <td className="px-3 py-3 font-mono text-[12px]">{m.slotCount}</td>
                <td className="px-3 py-3 font-mono text-[12px]">{m.bookedCount}</td>
                <td className="px-3 py-3"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.is_published ? 'bg-success-bg text-success' : 'bg-neutral-100 text-neutral-500'}`}>{m.is_published ? 'Published' : 'Draft'}</span></td>
              </tr>
            ))}
            {meetings.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-neutral-400">No meetings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

export async function AdminMeetingDetail({ basePath, id }: { basePath: string; id: string }) {
  const data = await fetchMeetingWithSlots(id)
  if (!data) return <p className="text-[13px] text-neutral-500">Meeting not found.</p>
  const bookings = await fetchMeetingBookings(id)
  const bySlot = new Map(bookings.map((b) => [b.slot_id, b]))

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 no-underline mb-4"><ArrowLeft size={13} /> Meetings</Link>
        <h1 className="text-[20px] font-bold text-neutral-900">{data.meeting.title}</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{dateLabel(data.meeting.meeting_date)}</p>
      </div>

      <MeetingForm basePath={basePath} meeting={data.meeting} />
      <AddSlotsForm meetingId={id} date={data.meeting.meeting_date} />

      <section className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <h2 className="px-5 py-3.5 text-[14px] font-semibold text-neutral-900 border-b border-neutral-100">Slots and bookings · <span className="font-mono">{bookings.length}</span> of <span className="font-mono">{data.slots.length}</span> booked</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[620px]">
            <thead><tr className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-left"><th className="pl-5 px-3 py-2.5">Time</th><th className="px-3 py-2.5">With</th><th className="px-3 py-2.5">Booked by</th><th className="px-3 py-2.5" /></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {data.slots.map((s) => {
                const b = bySlot.get(s.id)
                return (
                  <tr key={s.id}>
                    <td className="pl-5 px-3 py-3 font-mono text-[12px]">{timeLabel(s.starts_at)}–{timeLabel(s.ends_at)}</td>
                    <td className="px-3 py-3 text-neutral-600">{s.with_whom ?? '—'}</td>
                    <td className="px-3 py-3">{b ? <><span className="font-medium text-neutral-900">{b.student_name}</span><span className="block text-[11px] font-mono text-neutral-400">{b.student_class}{b.parent_name ? ` · ${b.parent_name}` : ''}{b.parent_phone ? ` · ${b.parent_phone}` : ''}</span></> : <span className="text-neutral-400">Free</span>}</td>
                    <td className="px-3 py-3 text-right"><SlotActions slotId={s.id} bookingId={b?.id ?? null} /></td>
                  </tr>
                )
              })}
              {data.slots.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-neutral-400">No slots yet. Add some above.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
