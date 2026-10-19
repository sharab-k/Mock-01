'use client'

import { askReportKind, type ReportKind } from '@/lib/reports/report-choice'

export type { ReportKind }

// Shared by the parent dashboard, the student marks page and every staff list —
// all wire their "Progress Report" button to this one function and the same
// real endpoint. With no `kind` it opens the choice popup first: the current
// month's report, or the full record to date.
//
// Returns true when a report was downloaded, false when the download failed,
// and null when the person closed the popup without choosing.
export async function downloadProgressReport(studentId: string, kind?: ReportKind): Promise<boolean | null> {
  const chosen = kind ?? await askReportKind()
  if (!chosen) return null

  const res = await fetch(`/api/reports/${studentId}?type=${chosen}`)
  if (!res.ok) return false

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const filenameMatch = disposition.match(/filename="([^"]+)"/)
  const filename = filenameMatch?.[1] ?? `progress-report-${studentId}-${chosen}.pdf`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  return true
}
