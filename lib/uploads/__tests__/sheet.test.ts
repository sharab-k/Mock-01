import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { grKey, idKey, normalizeHeader, parseDate, pick } from '../sheet'

describe('parseDate (how schools actually write dates)', () => {
  it.each([
    ['2026-10-03', '2026-10-03'],
    ['2026-1-3', '2026-01-03'],
    ['03/10/2026', '2026-10-03'], // day-first, as written in Pakistan
    ['3-10-2026', '2026-10-03'],
    ['3.10.2026', '2026-10-03'],
    ['15/09/2026', '2026-09-15'],
    ['3 Oct 2026', '2026-10-03'],
    ['2026-10-03T00:00:00.000Z', '2026-10-03'],
  ])('%s -> %s', (raw, expected) => {
    expect(parseDate(raw)).toBe(expected)
  })

  it.each(['', '   ', 'soon', '31/02/2026', '2026-13-01', '00/10/2026', '2026-02-30'])('rejects %j', (raw) => {
    expect(parseDate(raw)).toBeNull()
  })
})

describe('header and id normalisation', () => {
  it('matches column titles regardless of case, spaces and punctuation', () => {
    expect(normalizeHeader('GR No.')).toBe('grno')
    expect(normalizeHeader(' Exam Date ')).toBe('examdate')
    expect(normalizeHeader('Total Marks')).toBe('totalmarks')
  })

  it('treats "N 101", "N101" and "n  101 " as the same GR number', () => {
    expect(grKey('N 101')).toBe(grKey('N101'))
    expect(grKey('N 101')).toBe(grKey(' n  101 '))
  })

  it('collapses roll-number whitespace and case', () => {
    expect(idKey(' ICOM-1E1 ')).toBe('icom-1e1')
  })

  it('pick returns the first filled alias', () => {
    expect(pick({ score: '', marks: '42' }, ['marks', 'score'])).toBe('42')
    expect(pick({}, ['marks'])).toBe('')
  })
})
