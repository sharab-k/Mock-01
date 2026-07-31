'use client'

// Shared by the parent dashboard and the student marks page — both wire the
// same "Progress Report" button to the same real endpoint.
export async function downloadProgressReport(studentId: string): Promise<boolean> {
  const res = await fetch(`/api/reports/${studentId}`)
  if (!res.ok) return false

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const filenameMatch = disposition.match(/filename="([^"]+)"/)
  const filename = filenameMatch?.[1] ?? `progress-report-${studentId}.pdf`

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
