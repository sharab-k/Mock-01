import 'server-only'
import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const MAX_UPLOAD_ROWS = 5000

export type SheetRow = { rowNumber: number; cells: Record<string, string> }

// "GR No." -> "grno", "Exam Date" -> "examdate": header matching ignores case,
// spaces and punctuation so a school's own column titles still line up.
export function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined) return cellText(value.result as ExcelJS.CellValue)
    if ('richText' in value) return value.richText.map((r) => r.text).join('').trim()
    if ('text' in value) return String(value.text).trim()
    return ''
  }
  return String(value).trim()
}

// Reads the first worksheet of an .xlsx or .csv file into header-keyed rows.
// Blank rows are dropped; every cell comes back as trimmed text so the
// validators (not Excel's cell typing) decide what a value means.
export async function readSheet(file: File): Promise<{ ok: true; rows: SheetRow[] } | { ok: false; error: string }> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: 'File is too large (5 MB maximum).' }
  const name = file.name.toLowerCase()
  const isCsv = name.endsWith('.csv')
  if (!isCsv && !name.endsWith('.xlsx')) return { ok: false, error: 'Upload an .xlsx or .csv file.' }

  const workbook = new ExcelJS.Workbook()
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    // `map` keeps every CSV cell as the text it was typed as. ExcelJS's default
    // would turn "2026-10-05" into a local-time Date (a day earlier in Karachi).
    if (isCsv) await workbook.csv.read(Readable.from(buffer), { map: (value: unknown) => (value === '' ? null : value), parserOptions: { delimiter: ',' } })
    else await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
  } catch {
    return { ok: false, error: 'Could not read the file. Check that it is a valid spreadsheet.' }
  }

  const sheet = workbook.worksheets[0]
  if (!sheet || sheet.rowCount < 2) return { ok: false, error: 'The file has no data rows.' }

  const headers: string[] = []
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => { headers[col] = normalizeHeader(cellText(cell.value)) })

  const rows: SheetRow[] = []
  for (let r = 2; r <= sheet.rowCount; r++) {
    const cells: Record<string, string> = {}
    let any = false
    sheet.getRow(r).eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col]
      if (!key) return
      const text = cellText(cell.value)
      if (text !== '') any = true
      cells[key] = text
    })
    if (any) rows.push({ rowNumber: r, cells })
    if (rows.length > MAX_UPLOAD_ROWS) return { ok: false, error: `Too many rows (${MAX_UPLOAD_ROWS} maximum per file).` }
  }
  if (rows.length === 0) return { ok: false, error: 'The file has no data rows.' }
  return { ok: true, rows }
}

// First non-empty value among the accepted header spellings.
export function pick(cells: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) if (cells[a]) return cells[a]
  return ''
}

// ISO (2026-10-03), day-first (03/10/2026, 3-10-2026 — how Pakistan writes
// dates) or a written date ("3 Oct 2026"). Returns YYYY-MM-DD or null.
export function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/)
  if (match) { y = +match[1]; m = +match[2]; d = +match[3] }
  else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) { d = +match[1]; m = +match[2]; y = +match[3] }
  else {
    const t = Date.parse(`${s} UTC`)
    if (Number.isNaN(t)) return null
    const dt = new Date(t)
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate()
  }
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

export const todayIso = (): string => new Date().toISOString().slice(0, 10)

// "N 101 " and "n  101" are the same G.R. number.
export const idKey = (raw: string): string => raw.trim().toLowerCase().replace(/\s+/g, ' ')

// GR numbers are matched with ALL whitespace removed: the school's data has
// "N 101", "N101" and "N 101 " for the same kind of number.
export const grKey = (raw: string): string => raw.toLowerCase().replace(/\s+/g, '')
