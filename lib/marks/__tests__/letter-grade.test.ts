import { describe, expect, it } from 'vitest'
import { GRADE_SCALE, gradeTone, letterGrade } from '../letter-grade'

// The school's published scale — every band edge is asserted, from both
// sides, because off-by-one at 80/70/60/50/40/33 is exactly where a wrong
// grade would reach a parent.
describe('letterGrade — school grading scale', () => {
  it.each([
    [100, 'A-1'], [80, 'A-1'],
    [79.99, 'A'], [70, 'A'],
    [69.99, 'B'], [60, 'B'],
    [59.99, 'C'], [50, 'C'],
    [49.99, 'D'], [40, 'D'],
    [39.99, 'E'], [33, 'E'],
    [32.99, 'Fail'], [0, 'Fail'],
  ])('%s%% -> %s', (pct, expected) => {
    expect(letterGrade(pct, 100)).toBe(expected)
  })

  it('works on any total, not just 100', () => {
    expect(letterGrade(40, 50)).toBe('A-1') // 80%
    expect(letterGrade(35, 50)).toBe('A') // 70%
    expect(letterGrade(16.5, 50)).toBe('E') // 33%
    expect(letterGrade(16, 50)).toBe('Fail') // 32%
    expect(letterGrade(7, 10)).toBe('A') // 70% — 0.7 * 100 is 70.00000000000001 in floats
    expect(letterGrade(3, 10)).toBe('Fail') // 30%
  })

  it('never lets floating-point noise move a boundary mark into the wrong band', () => {
    for (let max = 1; max <= 200; max++) {
      for (const [pct, grade] of [[80, 'A-1'], [70, 'A'], [60, 'B'], [50, 'C'], [40, 'D'], [33, 'E']] as const) {
        const exact = (pct * max) / 100
        if (Number.isInteger(exact)) expect(letterGrade(exact, max)).toBe(grade)
      }
    }
  })

  it('lists the scale for display in the same order', () => {
    expect(GRADE_SCALE.map((g) => g.grade)).toEqual(['A-1', 'A', 'B', 'C', 'D', 'E', 'Fail'])
  })

  it('maps grades onto the existing semantic tones only', () => {
    expect(['A-1', 'A'].map(gradeTone)).toEqual(['success', 'success'])
    expect(gradeTone('B')).toBe('ink')
    expect(['C', 'D'].map(gradeTone)).toEqual(['warning', 'warning'])
    expect(['E', 'Fail'].map(gradeTone)).toEqual(['danger', 'danger'])
    expect(gradeTone('—')).toBe('ink')
  })
})
