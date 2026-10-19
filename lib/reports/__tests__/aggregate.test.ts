import { describe, expect, it } from 'vitest'
import { groupMarksByExam, computeOverallAverage, computeTier, computeAttendanceSummary, buildAttendanceLog } from '../aggregate'

// Phase 7 step 5 (BACKEND-IMPLEMENTATION-PLAN.md): empty state (no marks
// entered yet) must not crash, and full aggregation across all three exam
// types must group and average correctly.
describe('report aggregation', () => {
  it('empty state: no marks, no attendance — returns nulls, not a crash', () => {
    expect(groupMarksByExam([])).toEqual([])
    expect(computeOverallAverage([])).toBeNull()
    expect(computeTier(null)).toBeNull()
    expect(computeAttendanceSummary([])).toEqual({ attendancePct: null, presentDays: 0, totalDays: 0 })
  })

  it('groups marks by exam type across all three types, dropping empty groups', () => {
    const rows = [
      { subject: 'Mathematics', exam_type: 'monthly', score: 80, max_score: 100 },
      { subject: 'English', exam_type: 'monthly', score: 90, max_score: 100 },
      { subject: 'Mathematics', exam_type: 'half_yearly', score: 70, max_score: 100 },
      { subject: 'Mathematics', exam_type: 'final', score: 60, max_score: 100 },
    ]

    const grouped = groupMarksByExam(rows)
    expect(grouped.map((g) => g.examType)).toEqual(['monthly', 'half_yearly', 'final'])
    expect(grouped[0].rows).toHaveLength(2)
    expect(grouped[0].label).toBe('Monthly')
    expect(grouped[1].rows).toHaveLength(1)
    expect(grouped[2].rows).toHaveLength(1)
  })

  it('computes the overall average across all exam types combined, and the matching tier', () => {
    const rows = [
      { subject: 'Mathematics', exam_type: 'monthly', score: 90, max_score: 100 },
      { subject: 'English', exam_type: 'half_yearly', score: 70, max_score: 100 },
    ]
    const avg = computeOverallAverage(rows)
    expect(avg).toBe(80) // (90 + 70) / 2
    expect(computeTier(avg)).toBe('Distinction')
  })

  it('computes attendance percentage counting late as attended, matching the rest of the app\'s convention', () => {
    const rows = [{ status: 'present' }, { status: 'late' }, { status: 'absent' }, { status: 'present' }]
    expect(computeAttendanceSummary(rows)).toEqual({ attendancePct: 75, presentDays: 3, totalDays: 4 })
  })

  it('groups the full attendance log by calendar month, newest month and newest day first', () => {
    const rows = [
      { status: 'present', class_date: '2026-01-05' },
      { status: 'late', class_date: '2026-01-20' },
      { status: 'absent', class_date: '2026-02-03' },
    ]
    const log = buildAttendanceLog(rows)
    expect(log).toHaveLength(2)
    expect(log[0].label).toBe('February 2026')
    expect(log[0].rows).toEqual([{ date: '2026-02-03', status: 'absent' }])
    expect(log[1].label).toBe('January 2026')
    expect(log[1].rows).toEqual([{ date: '2026-01-20', status: 'late' }, { date: '2026-01-05', status: 'present' }])
  })

  it('empty attendance log produces no months, not a crash', () => {
    expect(buildAttendanceLog([])).toEqual([])
  })

  it('lists custom class tests in their own group, labelled with the test title', () => {
    const groups = groupMarksByExam([
      { subject: 'Physics', exam_type: 'final', score: 80, max_score: 100 },
      { subject: 'Physics', exam_type: 'custom', score: 9, max_score: 10, test_title: 'Chapter 4 Quiz' },
      { subject: 'Maths', exam_type: 'custom', score: 5, max_score: 10, test_title: null },
    ])
    expect(groups.map((g) => g.label)).toEqual(['Final', 'Class Tests'])
    expect(groups[1].rows.map((r) => r.subject)).toEqual(['Physics — Chapter 4 Quiz', 'Maths'])
  })
})

import { buildAttendanceMonths, buildFeeLines, buildMarksByMonth, monthEnd, monthLabel, resolveReportMonth } from '../aggregate'

describe('monthly report building', () => {
  it('names, bounds and clamps the report month', () => {
    expect(monthLabel('2026-10')).toBe('October 2026')
    expect(monthEnd('2026-02')).toBe('2026-02-28')
    expect(monthEnd('2028-02')).toBe('2028-02-29')
    const now = new Date('2026-10-19T12:00:00Z')
    expect(resolveReportMonth('2026-09', now).key).toBe('2026-09')
    expect(resolveReportMonth('2027-01', now).key).toBe('2026-10') // never a future month
    expect(resolveReportMonth('garbage', now).label).toBe('October 2026')
    expect(resolveReportMonth(null, now).key).toBe('2026-10')
  })

  it('attendance: every month up to the report month, newest first, with counts', () => {
    const rows = [
      { status: 'present', class_date: '2026-08-10' },
      { status: 'absent', class_date: '2026-09-02' },
      { status: 'late', class_date: '2026-09-01' },
      { status: 'present', class_date: '2026-10-05' },
      { status: 'present', class_date: '2026-11-03' }, // after the report month: excluded
    ]
    const months = buildAttendanceMonths(rows, '2026-10')
    expect(months.map((m) => m.key)).toEqual(['2026-10', '2026-09', '2026-08'])
    expect(months[0].isReportMonth).toBe(true)
    expect(months[1]).toMatchObject({ present: 0, late: 1, absent: 1, total: 2 })
    expect(months[1].rows.map((r) => r.date)).toEqual(['2026-09-01', '2026-09-02'])
  })

  it('marks: grouped by the month the exam was held, dated, with a monthly average', () => {
    const blocks = buildMarksByMonth([
      { subject: 'Maths', exam_type: 'monthly', score: 40, max_score: 50, exam_date: '2026-10-03' },
      { subject: 'English', exam_type: 'monthly', score: 20, max_score: 50, exam_date: '2026-09-15' },
      { subject: 'Physics', exam_type: 'custom', score: 9, max_score: 10, test_title: 'Quiz 1', exam_date: '2026-10-01' },
      { subject: 'Urdu', exam_type: 'final', score: 90, max_score: 100, exam_date: '2026-12-01' }, // after the report month
    ], '2026-10')
    expect(blocks.map((b) => b.key)).toEqual(['2026-10', '2026-09'])
    expect(blocks[0].isReportMonth).toBe(true)
    expect(blocks[0].rows.map((r) => [r.date, r.exam])).toEqual([['2026-10-01', 'Quiz 1'], ['2026-10-03', 'Monthly']])
    expect(blocks[0].average).toBe(85)
    expect(blocks[1].average).toBe(40)
  })

  it('fees: a line per month from enrolment to the report month; no record = unpaid', () => {
    const lines = buildFeeLines('2026-08-15', '2026-10', new Set(['2026-08', '2026-10']))
    expect(lines.map((l) => [l.key, l.status])).toEqual([['2026-10', 'paid'], ['2026-09', 'unpaid'], ['2026-08', 'paid']])
    expect(lines[0].isReportMonth).toBe(true)
    // crosses a year boundary and never goes before enrolment
    expect(buildFeeLines('2025-11-01', '2026-01', new Set()).map((l) => l.key)).toEqual(['2026-01', '2025-12', '2025-11'])
    // enrolled after the report month -> nothing to show
    expect(buildFeeLines('2026-11-01', '2026-10', new Set())).toEqual([])
  })
})
