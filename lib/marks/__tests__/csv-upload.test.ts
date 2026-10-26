import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { processMarksUpload } from '../upload'

// A chainable stand-in for the Supabase query builder: every method returns the
// same builder, and awaiting it yields the table's canned rows. Enough to drive
// the whole read-and-validate path (dry run — nothing is written).
function fakeClient(tables: Record<string, unknown[]>) {
  const builder = (rows: unknown[]) => {
    const b: Record<string, unknown> = {}
    const chain = new Proxy(b, {
      get: (_t, prop) => {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: rows, error: null })
        return () => chain
      },
    })
    return chain
  }
  return { from: (name: string) => builder(tables[name] ?? []) } as never
}

const students = [
  { id: 's1', full_name: 'Ayesha Naz', grade_level: '11', gr_number: 'FA 546', roll_number: '11A2' },
  { id: 's2', full_name: 'Saad Rasheed', grade_level: '11', gr_number: 'FB 543', roll_number: '11A5' },
]
const subjects = [{ name: 'Physics', grade_level: '11' }, { name: 'Mathematics', grade_level: '11' }]
const client = () => fakeClient({ students, subjects })
const csv = (text: string, name = 'marks.csv') => new File([text], name, { type: 'text/csv' })
const run = (text: string, opts: { examMonth?: string | null } = {}) =>
  processMarksUpload(client(), 'u1', csv(text), { examType: 'monthly', dryRun: true, notify: false, ...opts })

describe('marks CSV upload (one row per mark)', () => {
  const header = 'GR No,Subject,Marks,Total,Exam Date\r\n'

  it('reads a normal file and finds every mark', async () => {
    const out = await run(`${header}FA546,Physics,17,20,03/10/2026\r\nFB 543,Mathematics,35,40,2026-10-03\r\n`)
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.result.toSave).toBe(2)
      expect(out.result.errors).toEqual([])
    }
  })

  it('copes with a byte-order mark, quoted fields and a trailing blank line', async () => {
    const out = await run(`﻿${header}"FA546","Physics","17","20","03/10/2026"\r\n\r\n`)
    expect(out.ok && out.result.toSave).toBe(1)
  })

  it('reports (not crashes on) bad rows', async () => {
    const out = await run(`${header}ZZ999,Physics,17,20,03/10/2026\r\nFA546,Chemistry,17,20,03/10/2026\r\nFA546,Physics,99,20,03/10/2026\r\nFA546,Physics,17,20,not-a-date\r\n`)
    expect(out.ok && out.result.toSave).toBe(0)
    expect(out.ok && out.result.errors).toHaveLength(4)
  })

  it('refuses dates outside the chosen exam month, accepts those inside', async () => {
    const out = await run(`${header}FA546,Physics,17,20,03/10/2026\r\nFB 543,Physics,12,20,03/09/2026\r\n`, { examMonth: '2026-10' })
    expect(out.ok && out.result.toSave).toBe(1)
    expect(out.ok && out.result.errors[0].message).toContain('not in October 2026')
  })

  it('uses the chosen month for rows with no date', async () => {
    const out = await run('GR No,Subject,Marks,Total\r\nFA546,Physics,17,20\r\n', { examMonth: '2026-10' })
    expect(out.ok && out.result.toSave).toBe(1)
  })

  it('a missing date without a month is a clear error', async () => {
    const out = await run('GR No,Subject,Marks,Total\r\nFA546,Physics,17,20\r\n')
    expect(out.ok && out.result.errors[0].message).toContain('Exam date is missing')
  })

  it('rejects other file types and empty files politely', async () => {
    expect((await processMarksUpload(client(), 'u1', csv('x', 'marks.txt'), { examType: 'monthly', dryRun: true, notify: false })).ok).toBe(false)
    expect((await run('GR No,Subject,Marks\r\n')).ok).toBe(false)
  })
})
