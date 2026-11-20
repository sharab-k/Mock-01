// Parser for the school's "result sheet" layout: one sheet per class (or per
// group of classes), and inside it one or more tables that look like
//
//   Sr # | Gr # | Name      | 2026-09-01 | 2026-09-04 | …     <- a date per test
//        |      |           | M=20/B=35  | T=30       | …     <- total marks
//        |      |           | M/B        | PHY        | …     <- subject(s)
//   1    | F 501| Javeria … | 18         | 19         | …     <- one mark per cell
//
// Pure functions only (no database, no server-only imports) so the tricky
// parts — paired subjects, totals written several ways, "NILL"/"LEFT" cells —
// are unit tested directly.

export type WideGrid = { name: string; rows: string[][] }

export type ColumnTotals = {
  /** "M=20/B=35" — a total per subject key. null = the key was written but left blank. */
  byKey: Record<string, number | null>
  /** "T=20/35" — one total per alternative, in the order of the subject row. */
  positional: number[]
  /** "T=30" — the same total for every student. */
  single: number | null
  raw: string
}

export type WideColumn = {
  col: number
  date: string
  /** Subject abbreviations of this column, e.g. ['M','B'] for "M/B". */
  alts: string[]
  totals: ColumnTotals
  header: string
}

export type WideStudentRow = { row: number; gr: string; name: string; values: string[]; /** text of the sheet's FACULTY column, when it has one */ faculty: string }

export type WideBlock = {
  sheet: string
  headerRow: number
  columns: WideColumn[]
  /** index of the FACULTY column, or -1 */
  facultyCol: number
  students: WideStudentRow[]
}

const STRICT_DATE = /^(\d{4}-\d{1,2}-\d{1,2})|^(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/

export function looksLikeDate(text: string): boolean {
  return STRICT_DATE.test(text.trim())
}

// "T=20/35" -> positional [20,35]; "M=20/B=35" -> byKey; "T=30" -> single;
// "15CH/CM=30" (a typo for CH=15/CM=30) and "M/B=30" are tolerated.
export function parseTotals(raw: string): ColumnTotals {
  const out: ColumnTotals = { byKey: {}, positional: [], single: null, raw }
  const text = raw.toUpperCase().replace(/\s+/g, '')
  if (!text) return out

  const shared = text.match(/^([A-Z]+(?:\/[A-Z]+)+)=(\d+)$/)
  if (shared) {
    for (const k of shared[1].split('/')) out.byKey[k] = Number(shared[2])
    return out
  }

  const parts = text.split('/')
  parts.forEach((part, i) => {
    let m = part.match(/^T=(\d*)$/)
    if (m) {
      if (m[1] !== '') {
        out.single = Number(m[1])
        out.positional[0] = Number(m[1])
      }
      return
    }
    if ((m = part.match(/^([A-Z]+)=(\d*)$/))) {
      out.byKey[m[1]] = m[2] === '' ? null : Number(m[2])
      return
    }
    if ((m = part.match(/^(\d+)([A-Z]+)$/))) {
      out.byKey[m[2]] = Number(m[1])
      return
    }
    if (/^\d+$/.test(part)) {
      if (i === 0 && parts.length === 1) out.single = Number(part)
      else out.positional[i] = Number(part)
    }
  })
  if (out.positional.length > 1) out.single = null
  return out
}

// The newer sheets write the subject out in full ("MATH / BIOLOGY"); the older ones abbreviate it ("M/B"). Both come
// out as the same short codes.
const FULL_NAMES: Record<string, string> = {
  MATH: 'M', MATHS: 'M', MATHEMATICS: 'M', BIOLOGY: 'B', CHEMISTRY: 'CH', COMPUTER: 'CM', COMPUTERSCIENCE: 'CM', COMPUTERSTUDIES: 'CM',
  PHYSICS: 'PHY', URDU: 'URD', ISLAMIAT: 'ISL', ENGLISH: 'ENG', PAKSTUDIES: 'PST', PAKISTANSTUDIES: 'PST', ACCOUNTS: 'ACC', ACCOUNTING: 'ACC',
  PRINCIPLEOFCOMMERCE: 'POC', PRINCIPLESOFCOMMERCE: 'POC', STATISTICS: 'STATS', BANKING: 'BANK',
}

export function parseAlts(raw: string): string[] {
  return raw
    .toUpperCase()
    .split('/')
    .map((a) => a.replace(/[^A-Z]/g, ''))
    .filter(Boolean)
    .map((a) => FULL_NAMES[a] ?? a)
}

/** The sheet's FACULTY word as the system's faculty name; null when it does not name exactly one. */
export function facultyFromSheet(raw: string): 'Pre-Medical' | 'Pre-Engineering' | 'Computer Science' | null {
  const t = raw.toUpperCase().replace(/[^A-Z]/g, '')
  if (t === 'MEDICAL' || t === 'PREMEDICAL' || t === 'BIOLOGY') return 'Pre-Medical'
  if (t === 'CHEMISTRY' || t === 'ENGINEERING' || t === 'PREENGINEERING') return 'Pre-Engineering'
  if (t === 'COMPUTER' || t === 'COMPUTERSCIENCE') return 'Computer Science'
  return null
}

function isHeaderRow(row: string[], parseDate: (s: string) => string | null): boolean {
  let dates = 0
  for (let c = 3; c < row.length; c++) if (looksLikeDate(row[c] ?? '') && parseDate(row[c])) dates++
  return dates >= 1 && /^(sr|s\.?no|serial|gr|g\.?r)/i.test((row[0] || row[1] || '').trim())
}

const IS_TITLE = /^(sr|s.?no|serial|gr|g.?r)/i
// The newer layout: subject names on the first row (Sr # | Gr # | Name | FACULTY | MATH / BIOLOGY | …), the dates on
// the next row and the totals under that. The row itself holds no date.
function isTitleRow(rows: string[][], r: number, parseDate: (s: string) => string | null): boolean {
  const row = rows[r]
  if (!IS_TITLE.test((row[0] || row[1] || '').trim())) return false
  const next = rows[r + 1] ?? []
  // the dates row has no Sr # / G.R. of its own — a row with one is a student row of a flat one-row-per-mark file
  if ((next[0] ?? '').trim() || (next[1] ?? '').trim()) return false
  let datesBelow = 0
  for (let c = 3; c < next.length; c++) if (looksLikeDate(next[c] ?? '') && parseDate(next[c])) datesBelow++
  return datesBelow >= 1
}

// Finds every table in every sheet. A sheet may hold several tables (each
// starts with its own date/total/subject header rows); student rows belong to
// the nearest header above them. Blank rows inside a table are skipped, not
// treated as its end.
export function parseWideSheets(sheets: WideGrid[], parseDate: (s: string) => string | null): WideBlock[] {
  const blocks: WideBlock[] = []
  for (const sheet of sheets) {
    let current: WideBlock | null = null
    for (let r = 0; r < sheet.rows.length; r++) {
      const row = sheet.rows[r]
      const dateFirst = isHeaderRow(row, parseDate)
      if (dateFirst || isTitleRow(sheet.rows, r, parseDate)) {
        const dateRow = dateFirst ? row : (sheet.rows[r + 1] ?? [])
        const totalsRow = dateFirst ? (sheet.rows[r + 1] ?? []) : (sheet.rows[r + 2] ?? [])
        const subjectRow = dateFirst ? (sheet.rows[r + 2] ?? []) : row
        const columns: WideColumn[] = []
        const width = Math.max(row.length, dateRow.length)
        for (let c = 3; c < width; c++) {
          const date = looksLikeDate(dateRow[c] ?? '') ? parseDate(dateRow[c]) : null
          if (!date) continue
          columns.push({
            col: c,
            date,
            alts: parseAlts(subjectRow[c] ?? ''),
            totals: parseTotals(totalsRow[c] ?? ''),
            header: `${subjectRow[c] ?? ''} ${totalsRow[c] ?? ''}`.trim(),
          })
        }
        const facultyCol = subjectRow.findIndex((t, i) => i >= 3 && /^faculty$/i.test((t ?? '').trim()))
        current = { sheet: sheet.name, headerRow: r + 1, columns, facultyCol, students: [] }
        blocks.push(current)
        r += 2
        continue
      }
      if (!current) continue
      const gr = (row[1] ?? '').trim()
      const name = (row[2] ?? '').trim()
      if (!gr && !name) continue
      if (/^name of student/i.test(name)) continue
      current.students.push({ row: r + 1, gr, name, values: current.columns.map((c) => (row[c.col] ?? '').trim()), faculty: current.facultyCol >= 0 ? (row[current.facultyCol] ?? '').trim() : '' })
    }
  }
  return blocks
}

export type CellValue =
  | { kind: 'blank' }
  | { kind: 'no-mark'; text: string }
  | { kind: 'score'; score: number; total?: number }
  | { kind: 'error'; message: string }

const NO_MARK = new Set(['nill', 'nil', 'left', 'notjoin', 'notjoined', 'notcome', 'na', 'abs', 'absent', '-', '--', 'x'])

// One mark cell: a number; "O" (the letter, meaning 0); "17/20" or "(24 / 27)"
// (marks and total together); or a word meaning there is no mark for that
// student ("NILL", "LEFT", "not come").
export function parseCell(raw: string): CellValue {
  const text = raw.trim()
  if (!text) return { kind: 'blank' }
  const compact = text.toLowerCase().replace(/[\s.()]/g, '')
  if (NO_MARK.has(compact)) return { kind: 'no-mark', text }
  if (compact === 'o') return { kind: 'score', score: 0 }

  const frac = text.replace(/[()\s]/g, '').match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/)
  if (frac) return wholeScore(Number(frac[1]), Number(frac[2]), text)
  // (dots are kept here — "17.5" is 17.5, not 175)
  const plain = text.replace(/[()\s]/g, '')
  if (/^\d+(?:\.\d+)?$/.test(plain)) return wholeScore(Number(plain), undefined, text)
  return { kind: 'error', message: `Cannot read "${text}" as a mark.` }
}

function wholeScore(score: number, total: number | undefined, text: string): CellValue {
  if (!Number.isInteger(score) || (total !== undefined && !Number.isInteger(total))) {
    return { kind: 'error', message: `"${text}" is not a whole number (marks are stored as whole numbers).` }
  }
  return total === undefined ? { kind: 'score', score } : { kind: 'score', score, total }
}
