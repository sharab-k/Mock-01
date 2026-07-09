'use client'

import { use } from 'react'
import AdmissionsClassDetailContent from '@/components/dashboard/modules/AdmissionsClassDetailContent'

export default function ClassPipelinePage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = use(params)
  return <AdmissionsClassDetailContent grade={grade} section={section} basePath="/admissions" />
}
