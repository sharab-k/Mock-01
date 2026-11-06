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
