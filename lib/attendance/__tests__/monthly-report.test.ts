import { describe, expect, it } from 'vitest'
import { buildMonthlyReport, monthEnd, monthStart, type MonthlyRecordInput, type MonthlyStudentInput } from '../monthly-report'

const meta = { grade: '9', section: 'G1', year: 2026, month: 10 }
const stu = (id: string, name: string, active = true): MonthlyStudentInput => ({ id, roll: `9G1-${id}`, gr: `GR-${id}`, name, active })
const rec = (student_id: string, day: number, status: string, subject = '', month = 10): MonthlyRecordInput =>
  ({ student_id, class_date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, status, subject })

describe('buildMonthlyReport', () => {
  it('sizes the month and flags the weekdays (October 2026 has 31 days and starts on a Thursday)', () => {
    const r = buildMonthlyReport(meta, [stu('1', 'Ali')], [])
    expect(r.daysInMonth).toBe(31)
    expect(r.weekdays).toHaveLength(31)
    expect(r.weekdays[0]).toBe('T') // Thu 1 Oct
    expect(r.weekdays[3]).toBe('S') // Sun 4 Oct
    expect(buildMonthlyReport({ ...meta, month: 2, year: 2028 }, [], []).daysInMonth).toBe(29)
  })

  it('puts each whole-day status in its own day, and counts them', () => {
    const r = buildMonthlyReport(meta, [stu('1', 'Ali')], [rec('1', 1, 'present'), rec('1', 2, 'absent'), rec('1', 5, 'late'), rec('1', 6, 'leave')])
    const s = r.students[0]!
    expect(s.days.slice(0, 7)).toEqual(['P', 'A', '', '', 'L', 'LV', ''])
    expect(s).toMatchObject({ present: 1, absent: 1, late: 1, leave: 1 })
  })

  it('leave is excused: it is not in the percentage, and late counts as attended', () => {
    const r = buildMonthlyReport(meta, [stu('1', 'Ali')], [rec('1', 1, 'present'), rec('1', 2, 'late'), rec('1', 3, 'absent'), rec('1', 4, 'leave'), rec('1', 5, 'leave')])
    expect(r.students[0]!.pct).toBe(67) // (1 + 1) / 3
  })

  it('has no percentage until something countable is marked', () => {
    expect(buildMonthlyReport(meta, [stu('1', 'Ali')], []).students[0]!.pct).toBeNull()
    expect(buildMonthlyReport(meta, [stu('1', 'Ali')], [rec('1', 1, 'leave')]).students[0]!.pct).toBeNull()
  })

  it('ignores records from other months', () => {
    const r = buildMonthlyReport(meta, [stu('1', 'Ali')], [rec('1', 1, 'present', '', 9), rec('1', 1, 'absent', '', 11), rec('1', 2, 'present')])
    expect(r.students[0]!.present).toBe(1)
    expect(r.students[0]!.absent).toBe(0)
  })

  it('shows attended/periods for a day that only has subject-wise records, and the whole-day record wins when both exist', () => {
    const r = buildMonthlyReport({ ...meta, grade: '11', section: 'A' }, [stu('1', 'Ali')], [
      rec('1', 1, 'present', 'Physics'), rec('1', 1, 'absent', 'Urdu'), rec('1', 1, 'present', 'English'),
      rec('1', 2, 'present', 'Physics'), rec('1', 2, 'absent', ''),
      rec('1', 3, 'leave', 'Physics'),
    ])
    expect(r.students[0]!.days.slice(0, 3)).toEqual(['2/3', 'A', 'LV'])
  })

  it('keeps a student who has left only if they have records that month, and numbers the rest in order', () => {
    const r = buildMonthlyReport(meta, [stu('1', 'Ali'), stu('2', 'Gone Early', false), stu('3', 'Gone Late', false), stu('4', 'Sana')], [rec('3', 2, 'present')])
    expect(r.students.map((s) => s.name)).toEqual(['Ali', 'Gone Late', 'Sana'])
    expect(r.students.map((s) => s.serial)).toEqual([1, 2, 3])
    expect(r.students[1]!.inactive).toBe(true)
  })

  it('a missing GR number is an empty string, never "null"', () => {
    const r = buildMonthlyReport(meta, [{ ...stu('1', 'Ali'), gr: null }], [])
    expect(r.students[0]!.gr).toBe('')
  })
})

describe('month bounds', () => {
  it('finds the first and last day', () => {
    expect(monthStart(2026, 2)).toBe('2026-02-01')
    expect(monthEnd(2026, 2)).toBe('2026-02-28')
    expect(monthEnd(2028, 2)).toBe('2028-02-29')
    expect(monthEnd(2026, 12)).toBe('2026-12-31')
  })
})
