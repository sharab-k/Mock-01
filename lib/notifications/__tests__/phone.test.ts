import { describe, expect, it } from 'vitest'
import { toE164 } from '../phone'

describe('toE164 (Pakistani numbers as parents write them)', () => {
  it.each([
    ['03001234567', '+923001234567'],
    ['0300 1234567', '+923001234567'],
    ['0300-123-4567', '+923001234567'],
    ['+923001234567', '+923001234567'],
    ['+92 300 1234567', '+923001234567'],
    ['923001234567', '+923001234567'],
    ['00923001234567', '+923001234567'],
    ['3001234567', '+923001234567'],
    ['(0300) 1234567', '+923001234567'],
    ['+14155238886', '+14155238886'], // already international: untouched
  ])('%s -> %s', (raw, expected) => {
    expect(toE164(raw)).toBe(expected)
  })

  it.each([null, undefined, '', '   ', 'abc', '123', '+12', '0300-12345-6789012'])('rejects %s', (raw) => {
    expect(toE164(raw as string | null | undefined)).toBeNull()
  })
})
