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
})
