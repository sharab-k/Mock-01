import { describe, expect, it } from 'vitest'
import { formatRs, isFeeStatus, monthLabel, toNumber } from '../constants'

describe('fee constants', () => {
  it('formats rupees without paisa when whole', () => {
    expect(formatRs(6000)).toBe('Rs 6,000')
    expect(formatRs(1234567)).toBe('Rs 1,234,567')
  })
  it('keeps two decimals when there is paisa', () => {
    expect(formatRs(1500.5)).toBe('Rs 1,500.50')
  })
  it('turns numeric strings into numbers and never returns NaN', () => {
    expect(toNumber('6000.00')).toBe(6000)
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
    expect(toNumber('abc')).toBe(0)
  })
  it('recognises the four statuses only', () => {
    for (const s of ['paid', 'unpaid', 'partially_paid', 'overdue']) expect(isFeeStatus(s)).toBe(true)
    expect(isFeeStatus('late')).toBe(false)
  })
  it('labels a month, or just the year for a one-off', () => {
    expect(monthLabel(2026, 3)).toBe('March 2026')
    expect(monthLabel(2026, null)).toBe('2026')
  })
})
