import ExcelJS from 'exceljs'

export type SheetColumn = { header: string; key: string; width: number; align?: 'left' | 'center' | 'right' }
export type SheetValue = string | number | null
export type SheetRow = Record<string, SheetValue>

export type WorkbookOptions = {
  title: string
  sheetName: string
  columns: SheetColumn[]
  rows: SheetRow[]
  /** Optional per-cell fill colour (ARGB, e.g. 'FFEAF5F0'), for status colouring. */
  fill?: (row: SheetRow, key: string) => string | undefined
}

const INK = 'FF233357'

/**
 * One clean table: a header row, one row per record, frozen header and filters, so the sheet opens ready to
 * sort and filter. Every value is written as a plain value (text stays text), so a name or number that
 * starts with "=" or "+" can never run as a formula.
 */
export async function buildWorkbook(o: WorkbookOptions): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'J.E Academy'
  wb.title = o.title
  wb.created = new Date()

  // Excel limits a sheet name to 31 characters and a few symbols.
  const ws = wb.addWorksheet(o.sheetName.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Sheet1', { views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }] })
  ws.columns = o.columns.map((c) => ({ header: c.header, key: c.key, width: c.width, style: { alignment: { horizontal: c.align ?? 'left', vertical: 'middle' } } }))

  const head = ws.getRow(1)
  head.height = 22
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  })

  for (const r of o.rows) {
    const row = ws.addRow(Object.fromEntries(o.columns.map((c) => [c.key, r[c.key] ?? ''])))
    if (o.fill) {
      o.columns.forEach((c, i) => {
        const argb = o.fill!(r, c.key)
        if (argb) row.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
      })
    }
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: o.columns.length } }
  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
