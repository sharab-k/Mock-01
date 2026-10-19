import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { renderReportPdf, SCHOOL_NAME } from '../pdf-lite'
import type { ReportData } from '../report-data'

function sample(overrides: Partial<ReportData> = {}): ReportData {
  return {
    student: { fullName: 'Ayesha Khan', rollNumber: '9B15', grNumber: 'N 111', gradeLevel: '9', section: 'B1', program: 'SSC-1' },
    scope: 'full',
    reportMonth: { key: '2026-10', label: 'October 2026' },
    generatedAt: '2026-10-05T10:00:00.000Z',
    attendancePct: 88,
    presentDays: 22,
    totalDays: 25,
    monthAttendancePct: 90,
    monthPresentDays: 9,
    monthTotalDays: 10,
    attendanceMonths: [],
    marksByMonth: [],
    overallAverage: 74,
    monthAverage: 80,
    tier: 'Merit',
    fees: { monthlyFee: 6000, lines: [], paidCount: 0 },
    ...overrides,
  }
}

describe('renderReportPdf (no-browser PDF)', () => {
  it('prints the school name exactly as J.E ACADEMY', () => {
    expect(SCHOOL_NAME).toBe('J.E ACADEMY')
  })

  it('produces a valid PDF with marks, attendance and a fee record', async () => {
    const bytes = await renderReportPdf(sample({
      marksByMonth: [
        {
          key: '2026-10', label: 'October 2026', isReportMonth: true, average: 80,
          rows: [
            { date: '2026-10-03', subject: 'Physics', exam: 'Monthly', score: 41, maxScore: 50, grade: 'A-1' },
            { date: '2026-10-08', subject: 'Physics', exam: 'Chapter 4 Quiz', score: 9, maxScore: 10, grade: 'A-1' },
          ],
        },
        { key: '2026-09', label: 'September 2026', isReportMonth: false, average: 60, rows: [{ date: '2026-09-15', subject: 'English', exam: 'Monthly', score: 30, maxScore: 50, grade: 'B' }] },
      ],
      attendanceMonths: [
        { key: '2026-10', label: 'October 2026', isReportMonth: true, present: 1, late: 1, absent: 1, total: 3, rows: [{ date: '2026-10-01', status: 'present' }, { date: '2026-10-02', status: 'late' }, { date: '2026-10-03', status: 'absent' }] },
      ],
      fees: {
        monthlyFee: 6000,
        paidCount: 1,
        lines: [
          { key: '2026-10', label: 'October 2026', status: 'unpaid', isReportMonth: true },
          { key: '2026-09', label: 'September 2026', status: 'paid', isReportMonth: false },
        ],
      },
    }))
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    expect(doc.getTitle()).toBe('Full Progress Report — Ayesha Khan — October 2026')
    expect(doc.getAuthor()).toBe('J.E ACADEMY')
  })

  it('produces the current-month variant, labelled as such', async () => {
    const bytes = await renderReportPdf(sample({
      scope: 'month',
      fees: { monthlyFee: 6000, paidCount: 1, lines: [{ key: '2026-10', label: 'October 2026', status: 'paid', isReportMonth: true }, { key: '2026-09', label: 'September 2026', status: 'unpaid', isReportMonth: false }] },
    }))
    const doc = await PDFDocument.load(bytes)
    expect(doc.getTitle()).toBe('Monthly Progress Report — Ayesha Khan — October 2026')
  })

  it('handles an empty report (no marks, no attendance, no fee months)', async () => {
    const bytes = await renderReportPdf(sample({ attendancePct: null, presentDays: 0, totalDays: 0, monthAttendancePct: null, monthPresentDays: 0, monthTotalDays: 0, overallAverage: null, monthAverage: null, tier: null }))
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
  })

  it('does not throw on characters outside the standard PDF fonts (e.g. Urdu names)', async () => {
    const bytes = await renderReportPdf(sample({ student: { fullName: 'عائشہ خان', rollNumber: '9B16', grNumber: null, gradeLevel: '9', section: 'B1', program: 'SSC-1' } }))
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
  })

  it('flows long attendance, marks and fee history onto additional pages instead of overflowing', async () => {
    const rows = Array.from({ length: 450 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      status: (i % 7 === 0 ? 'absent' : 'present') as 'present' | 'absent',
    }))
    const bytes = await renderReportPdf(sample({
      attendanceMonths: [{ key: '2026-10', label: 'October 2026', isReportMonth: true, present: 380, late: 0, absent: 70, total: 450, rows }],
      fees: { monthlyFee: null, paidCount: 0, lines: Array.from({ length: 24 }, (_, i) => ({ key: `k${i}`, label: `Month ${i}`, status: 'unpaid' as const, isReportMonth: i === 0 })) },
    }))
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThan(1)
  })
})
