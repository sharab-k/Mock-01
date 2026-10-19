import { describe, expect, it } from 'vitest'
import { parseCell, parseTotals, parseWideSheets, parseAlts } from '../wide-sheet'
import { buildMatcher, gradesForSheet, nameAgreement, type MatchStudent } from '../student-match'
import { chooseAlternative, subjectNameFor, totalFor } from '../wide-subjects'

// Same lenient date parser the server uses, trimmed to what these tests need.
const parseDate = (s: string): string | null => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? null
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const d = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  return d ? `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}` : null
}

describe('totals header (the many ways the sheet writes a total)', () => {
  it('single, positional and keyed totals', () => {
    expect(parseTotals('T=30').single).toBe(30)
    expect(parseTotals('T=20/35')).toMatchObject({ positional: [20, 35], single: null })
    expect(parseTotals('T=30/30').positional).toEqual([30, 30])
    expect(parseTotals('M=20/B=35').byKey).toEqual({ M: 20, B: 35 })
    expect(parseTotals('B=35/M=').byKey).toEqual({ B: 35, M: null })
    expect(parseTotals('XII=22/XI=25').byKey).toEqual({ XII: 22, XI: 25 })
  })

  it('tolerates the typos found in the real sheets', () => {
    expect(parseTotals('15CH/CM=30').byKey).toEqual({ CH: 15, CM: 30 })
    expect(parseTotals('M/B=30').byKey).toEqual({ M: 30, B: 30 })
  })

  it('splits shared subject columns', () => {
    expect(parseAlts('M/B')).toEqual(['M', 'B'])
    expect(parseAlts('URD.')).toEqual(['URD'])
    expect(parseAlts('POC/BANK.')).toEqual(['POC', 'BANK'])
  })
})

describe('mark cells', () => {
  it('numbers, the letter O, fractions and no-mark words', () => {
    expect(parseCell('18')).toEqual({ kind: 'score', score: 18 })
    expect(parseCell('O')).toEqual({ kind: 'score', score: 0 })
    expect(parseCell('17/20')).toEqual({ kind: 'score', score: 17, total: 20 })
    expect(parseCell('(24 / 27 )')).toEqual({ kind: 'score', score: 24, total: 27 })
    expect(parseCell('')).toEqual({ kind: 'blank' })
    for (const w of ['NILL', 'LEFT', 'left', 'NOT JOIN', 'not come']) expect(parseCell(w).kind).toBe('no-mark')
  })

  it('refuses what it cannot read instead of guessing', () => {
    expect(parseCell('abc').kind).toBe('error')
    expect(parseCell('17.5').kind).toBe('error')
  })
})

describe('table layout', () => {
  const grid = {
    name: 'xi tcf',
    rows: [
      ['Sr #', 'Gr #', 'Name of students', '2026-09-01', '2026-09-04'],
      ['', '', 'Name of students', 'M=20/B=35', 'T=30'],
      ['', '', 'Name of students', 'M/B', 'PHY'],
      ['1', 'F 501', 'Ali One', '18', '19'],
      ['', '', '', '', ''], // blank row inside a table must not end it
      ['2', 'F 502', 'Sara Two', 'NILL', '20'],
      ['Sr #', 'Gr #', 'Name of students', '03/09/2026', '2026-09-11'], // a second table in the same sheet
      ['', '', 'Name of students', 'T=30', 'T=25'],
      ['', '', 'Name of students', 'ENG.', 'ISL.'],
      ['', '', 'No Gr Girl', '7', '8'],
    ],
  }

  it('finds every table and keeps students under the right header', () => {
    const blocks = parseWideSheets([grid], parseDate)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].columns.map((c) => [c.date, c.alts.join('/')])).toEqual([['2026-09-01', 'M/B'], ['2026-09-04', 'PHY']])
    expect(blocks[0].students.map((s) => s.gr)).toEqual(['F 501', 'F 502'])
    expect(blocks[1].columns.map((c) => c.date)).toEqual(['2026-09-03', '2026-09-11'])
    expect(blocks[1].students[0]).toMatchObject({ gr: '', name: 'No Gr Girl', values: ['7', '8'] })
  })

  it('a flat one-row-per-mark file is not mistaken for a result sheet', () => {
    const flat = { name: 'a', rows: [['GR No', 'Subject', 'Marks'], ['N 101', 'Maths', '40']] }
    expect(parseWideSheets([flat], parseDate)).toHaveLength(0)
  })
})

describe('which subject does a shared column mean for this student', () => {
  it('follows the stream', () => {
    const pm = { grade: '11', stream: 'Pre-Medical' }
    const pe = { grade: '11', stream: 'Pre-Engineering' }
    const cs = { grade: '11', stream: 'Computer Science' }
    expect(chooseAlternative(['M', 'B'], pm)).toBe('B')
    expect(chooseAlternative(['M', 'B'], pe)).toBe('M')
    expect(chooseAlternative(['M', 'B'], cs)).toBe('M')
    expect(chooseAlternative(['CH', 'CM'], pm)).toBe('CH')
    expect(chooseAlternative(['CH', 'CM'], cs)).toBe('CM')
  })

  it('follows the year for Islamiat/Pak Studies and Accounts/Stats', () => {
    expect(chooseAlternative(['ISL', 'PST'], { grade: '11', stream: null })).toBe('ISL')
    expect(chooseAlternative(['ISL', 'PST'], { grade: '12', stream: null })).toBe('PST')
    expect(chooseAlternative(['ACC', 'STATS'], { grade: 'ICOM-1', stream: null })).toBe('ACC')
    expect(chooseAlternative(['ACC', 'STATS'], { grade: 'ICOM-2', stream: null })).toBe('STATS')
  })

  it('refuses to guess when the student data cannot say', () => {
    expect(chooseAlternative(['M', 'B'], { grade: '11', stream: null })).toBeNull()
    expect(chooseAlternative(['POC', 'BANK'], { grade: 'ICOM-1', stream: null })).toBeNull()
  })

  it('takes the total that belongs to the chosen subject', () => {
    const g = { grade: '11', stream: 'Pre-Medical' }
    expect(totalFor(parseTotals('M=20/B=35'), ['M', 'B'], 'B', g)).toBe(35)
    expect(totalFor(parseTotals('T=20/35'), ['M', 'B'], 'B', g)).toBe(35)
    expect(totalFor(parseTotals('T=30'), ['PHY'], 'PHY', g)).toBe(30)
    expect(totalFor(parseTotals('B=35/M='), ['M', 'B'], 'M', g)).toBeNull()
    expect(totalFor(parseTotals('XII=22/XI=25'), ['ACC', 'STATS'], 'ACC', { grade: 'ICOM-1', stream: null })).toBe(25)
    expect(totalFor(parseTotals('XII=22/XI=25'), ['ACC', 'STATS'], 'STATS', { grade: 'ICOM-2', stream: null })).toBe(22)
  })

  it("uses the grade's own spelling of the subject", () => {
    const subjects = [{ name: 'MATHEMATICS', grade: '11' }, { name: 'Mathematics', grade: '12' }, { name: 'PAK. STUDIES', grade: '12' }]
    expect(subjectNameFor('M', '11', subjects)).toBe('MATHEMATICS')
    expect(subjectNameFor('M', '12', subjects)).toBe('Mathematics')
    expect(subjectNameFor('PST', '12', subjects)).toBe('PAK. STUDIES')
    expect(subjectNameFor('PST', '11', subjects)).toBeNull()
  })
})

describe('matching a sheet row to a student', () => {
  const students: MatchStudent[] = [
    { id: 'a', fullName: 'JAVERIA AHMED', gr: 'FA 501', grade: '11', stream: null },
    { id: 'b', fullName: 'MUHAMMAD AYAN SIDDIQUI', gr: 'FA 502', grade: '11', stream: null },
    { id: 'c', fullName: 'UMAIMA', gr: 'N229', grade: '9', stream: null },
    { id: 'd', fullName: 'AYESHA NAZ', gr: 'FA546', grade: '11', stream: null },
    { id: 'e', fullName: 'SARA KHAN', gr: 'FB 600', grade: '11', stream: null },
  ]
  const match = buildMatcher(students)
  const eleven = gradesForSheet('xi a')

  it('exact G.R. ignores spaces and case', () => {
    expect(match('fa501', 'Javeria Ahmed', eleven)).toMatchObject({ ok: true, via: 'gr' })
    expect(match('FA 546', '', eleven)).toMatchObject({ ok: true, student: { id: 'd' } })
  })

  it('"F 502" finds "FA 502" by number when the name agrees', () => {
    expect(match('F 502', 'M. Ayan Siddiqui', eleven)).toMatchObject({ ok: true, via: 'gr-number', student: { id: 'b' } })
  })

  it('refuses a number-only match when the name is a different person', () => {
    const r = match('F 501', 'Javeria Shahzad', eleven)
    expect(r.ok).toBe(false)
  })

  it('never links a single shared first name to another child', () => {
    // "Omaima Siddiqui" must not be matched to the Grade 9 child "UMAIMA".
    expect(match('SB 736', 'Omaima Siddiqui', gradesForSheet('xii b')).ok).toBe(false)
    expect(match('', 'Omaima Siddiqui', eleven).ok).toBe(false)
  })

  it('matches by name alone only with two agreeing words, inside the sheet\'s grades', () => {
    expect(match('', 'Ayesha Naz', eleven)).toMatchObject({ ok: true, via: 'name', student: { id: 'd' } })
    expect(match('', 'Ayesha Naz', gradesForSheet('xii a')).ok).toBe(false)
  })

  it('name agreement understands Muhammad abbreviations and small typos', () => {
    expect(nameAgreement('M. Ayan Siddiqui', 'MUHAMMAD AYAN SIDDIQUI').ratio).toBe(1)
    expect(nameAgreement('Abudllah Pervaiz', 'ABDULLAH PERVAIZ').hits).toBeGreaterThanOrEqual(1)
  })

  it('maps sheet tabs to the grades they cover', () => {
    expect([...gradesForSheet('xi a')].sort()).toEqual(['11', 'ICOM-1'])
    expect([...gradesForSheet('xii com')]).toEqual(['ICOM-2'])
    expect([...gradesForSheet('com tcf')].sort()).toEqual(['ICOM-1', 'ICOM-2'])
    expect([...gradesForSheet('Sheet1')].sort()).toEqual(['11', '12', 'ICOM-1', 'ICOM-2'])
  })
})
