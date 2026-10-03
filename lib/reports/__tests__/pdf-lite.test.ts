import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { renderReportPdf } from '../pdf-lite'
import type { ReportData } from '../report-data'

function sample(overrides: Partial<ReportData> = {}): ReportData {
  return {
    student: { fullName: 'Ayesha Khan', rollNumber: '9B15', gradeLevel: '9', section: 'B1', program: 'SSC-1' },
    term: '2026-T1',
    generatedAt: '2026-10-05T10:00:00.000Z',
    attendancePct: 88,
    presentDays: 22,
    totalDays: 25,
    attendanceLog: [],
    marksByExam: [],
    overallAverage: 74,
    tier: 'Merit',
    ...overrides,
  }
}

describe('renderReportPdf (no-browser PDF)', () => {
  it('produces a valid PDF for a report with marks, class tests and attendance', async () => {
    const bytes = await renderReportPdf(sample({
      marksByExam: [
        { examType: 'monthly', label: 'Monthly', rows: [{ subject: 'Physics', score: 41, maxScore: 50, grade: 'A-' }, { subject: 'English', score: 30, maxScore: 50, grade: 'C' }] },
        { examType: 'custom', label: 'Class Tests', rows: [{ subject: 'Physics — Chapter 4 Quiz', score: 9, maxScore: 10, grade: 'A+' }] },
      ],
      attendanceLog: [
        { label: 'September 2026', rows: [{ date: '2026-09-14', status: 'present' }, { date: '2026-09-15', status: 'late' }, { date: '2026-09-16', status: 'absent' }] },
      ],
    }))
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it('handles an empty report (no marks, no attendance)', async () => {
    const bytes = await renderReportPdf(sample({ attendancePct: null, presentDays: 0, totalDays: 0, overallAverage: null, tier: null }))
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
  })

  it('does not throw on characters outside the standard PDF fonts (e.g. Urdu names)', async () => {
    const bytes = await renderReportPdf(sample({ student: { fullName: 'عائشہ خان', rollNumber: '9B16', gradeLevel: '9', section: 'B1', program: 'SSC-1' } }))
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
  })

  it('flows long attendance history onto additional pages instead of overflowing', async () => {
    const rows = Array.from({ length: 450 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      status: (i % 7 === 0 ? 'absent' : 'present') as 'present' | 'absent',
    }))
    const bytes = await renderReportPdf(sample({ attendanceLog: [{ label: 'Whole term', rows }] }))
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThan(1)
  })
})
