'use client'

import { use } from 'react'
import MarksClassDetailContent from '@/components/dashboard/modules/MarksClassDetailContent'

export default function ClassMarksPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = use(params)
  return <MarksClassDetailContent grade={grade} section={section} basePath="/marks" />
}
