import { describe, expect, it } from 'vitest'
import { currentMonthKey, dateInMonth, recentMonths } from '../months'

describe('month options', () => {
  it('lists the current month first, newest to oldest, across a year boundary', () => {
    const m = recentMonths(3, new Date(2026, 0, 15))
    expect(m.map((x) => x.key)).toEqual(['2026-01', '2025-12', '2025-11'])
    expect(m[1].label).toBe('December 2025')
  })

  it('currentMonthKey is YYYY-MM', () => {
    expect(currentMonthKey(new Date(2026, 9, 26))).toBe('2026-10')
  })

  it('keeps the day when switching months, clamps to month end and to today', () => {
    expect(dateInMonth('2026-09', '2026-10-15', '2026-10-26')).toBe('2026-09-15')
    expect(dateInMonth('2026-02', '2026-10-31', '2026-10-26')).toBe('2026-02-28')
    expect(dateInMonth('2026-10', '2026-09-30', '2026-10-26')).toBe('2026-10-26')
  })
})
