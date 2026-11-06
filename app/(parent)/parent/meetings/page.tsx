import { Users2 } from 'lucide-react'
import { ParentBooking, type ParentMeetingView } from '@/components/dashboard/meetings/MeetingParts'
import { dateLabel, fetchMeetingWithSlots, fetchMeetings, fetchMyBookings, timeLabel } from '@/lib/meetings/data'
import { fetchParentChildren } from '@/lib/parent/dashboard-data'

export default async function ParentMeetingsPage() {
  const [meetings, kids, mine] = await Promise.all([fetchMeetings(), fetchParentChildren(), fetchMyBookings()])
  const today = new Date().toISOString().slice(0, 10)
  // RLS already limits a parent to published meetings; hide the ones that are over.
  const upcoming = meetings.filter((m) => m.meeting_date >= today).sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
  const details = await Promise.all(upcoming.map((m) => fetchMeetingWithSlots(m.id)))

  const views: ParentMeetingView[] = details.flatMap((d) => {
    if (!d) return []
    const label = (s: { starts_at: string; ends_at: string }) => `${timeLabel(s.starts_at)}–${timeLabel(s.ends_at)}`
    return [{
      id: d.meeting.id, title: d.meeting.title, dateLabel: dateLabel(d.meeting.meeting_date), briefing: d.meeting.briefing,
      slots: d.slots.map((s) => ({ id: s.id, label: label(s), with_whom: s.with_whom, taken: s.taken })),
      kids: kids.map((k) => {
        const b = mine.find((x) => x.meeting_id === d.meeting.id && x.student_id === k.id)
        const slot = b ? d.slots.find((s) => s.id === b.slot_id) : undefined
        return { id: k.id, name: k.name, booking: b && slot ? { id: b.id, slotLabel: `${label(slot)}${slot.with_whom ? ` · ${slot.with_whom}` : ''}` } : null }
      }),
    }]
  })

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><Users2 size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Parents teacher meetings</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Read the briefing and book a time slot for each of your children.</p>
        </div>
      </div>
      {views.length === 0 && <p className="text-[13px] text-neutral-500 bg-white rounded-2xl border border-neutral-200 p-6 text-center">No meetings are open for booking right now.</p>}
      {views.map((v) => <ParentBooking key={v.id} meeting={v} />)}
    </>
  )
}
