import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AttendanceMarkContent from '@/components/dashboard/modules/AttendanceMarkContent'
import { fetchMarkerClasses } from '@/lib/attendance/marker-classes'

export default async function MarkAttendancePage() {
  const classes = await fetchMarkerClasses()

  return (
    <>
      <div>
        <Link href="/attendance" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Attendance
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Mark Today&apos;s Attendance</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Single-click check-in · submits trigger WhatsApp alerts for absences</p>
      </div>

      <AttendanceMarkContent classes={classes} />
    </>
  )
}
