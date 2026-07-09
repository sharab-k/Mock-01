'use client'

import { use } from 'react'
import AttendanceClassDetailContent from '@/components/dashboard/modules/AttendanceClassDetailContent'

export default function SuperAdminAttendanceClassPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = use(params)
  return <AttendanceClassDetailContent grade={grade} section={section} basePath="/super-admin/attendance" />
}
