import { describe, expect, it } from 'vitest'
import { dayName, longDate, resolveFirstYearSelection } from '../first-year-selection'

describe('resolveFirstYearSelection', () => {
  it('keeps a valid selection', () => {
    expect(resolveFirstYearSelection({ section: 'C', date: '2026-11-05', faculty: 'Pre-Medical', subject: 'Biology' }))
      .toEqual({ grade: '11', section: 'C', classDate: '2026-11-05', faculty: 'Pre-Medical', subject: 'Biology' })
  })
  it('falls back to section A and no faculty/subject for junk', () => {
    const s = resolveFirstYearSelection({ section: 'Z', faculty: 'Commerce', subject: 'Underwater Basket Weaving' })
    expect(s.section).toBe('A')
    expect(s.faculty).toBeNull()
    expect(s.subject).toBe('')
  })
  it('drops a subject the chosen faculty does not study', () => {
    expect(resolveFirstYearSelection({ faculty: 'Pre-Engineering', subject: 'Biology' }).subject).toBe('')
    expect(resolveFirstYearSelection({ faculty: 'Pre-Medical', subject: 'Biology' }).subject).toBe('Biology')
  })
  it('accepts any subject with no faculty chosen (a common list across faculties)', () => {
    expect(resolveFirstYearSelection({ subject: 'Mathematics' }).subject).toBe('Mathematics')
  })
  it('never selects a future date', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(resolveFirstYearSelection({ date: '2999-01-01' }).classDate).toBe(today)
  })
})

describe('date labels', () => {
  it('5 November 2026 is a Thursday (the document\'s own example)', () => {
    expect(dayName('2026-11-05')).toBe('Thursday')
    expect(longDate('2026-11-05')).toBe('5 November 2026')
  })
})

describe('resolveFirstYearSelection for Second Year', () => {
  it('carries the grade and accepts Pak. Studies', () => {
    const s = resolveFirstYearSelection({ section: 'B', faculty: 'Pre-Medical', subject: 'Pak. Studies' }, '12')
    expect(s).toMatchObject({ grade: '12', section: 'B', faculty: 'Pre-Medical', subject: 'Pak. Studies' })
  })
  it('drops Islamiat, which Second Year does not study', () => {
    expect(resolveFirstYearSelection({ subject: 'Islamiat' }, '12').subject).toBe('')
    expect(resolveFirstYearSelection({ subject: 'Islamiat' }).subject).toBe('Islamiat')
  })
})

import { moveToMonth } from '../class-date'

describe('moveToMonth', () => {
  const today = '2026-11-06'
  it('keeps the day of the month', () => expect(moveToMonth('2026-10-15', '2026-09', today)).toBe('2026-09-15'))
  it('clamps to the end of a shorter month', () => expect(moveToMonth('2026-10-31', '2026-11', '2026-12-31')).toBe('2026-11-30'))
  it('never goes past today', () => {
    expect(moveToMonth('2026-10-31', '2026-11', today)).toBe('2026-11-06')
    expect(moveToMonth('2026-10-15', '2027-01', today)).toBe('2026-11-06')
  })
  it('handles leap-year February', () => expect(moveToMonth('2028-01-31', '2028-02', '2028-12-31')).toBe('2028-02-29'))
  it('ignores a bad month', () => expect(moveToMonth('2026-10-15', 'nope', today)).toBe('2026-10-15'))
})
