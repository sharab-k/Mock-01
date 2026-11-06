import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { POPPINS_BOLD_BASE64, POPPINS_REGULAR_BASE64, POPPINS_SEMIBOLD_BASE64 } from '@/lib/cards/poppins-data'
import { truncateToWidth } from '@/lib/cards/card-data'

export type ReportColumn = { label: string; width: number; align?: 'left' | 'right' }
export type ReportTable = { title: string; columns: ReportColumn[]; rows: string[][]; footer?: string[] }
export type ReportData = {
  title: string
  subtitle: string
  summary: [label: string, value: string][]
  tables: ReportTable[]
}

const PW = 595.28
const PH = 841.89
const M = 36
const INK = rgb(0.137, 0.2, 0.341)
const TEXT = rgb(0.15, 0.13, 0.11)
const MUTED = rgb(0.45, 0.42, 0.38)
const RULE = rgb(0.86, 0.84, 0.81)
const BAND = rgb(0.965, 0.96, 0.95)

/** Widths are relative; they are scaled to fill the printable width. */
function scaled(cols: ReportColumn[]): number[] {
  const total = cols.reduce((n, c) => n + c.width, 0)
  return cols.map((c) => (c.width / total) * (PW - 2 * M))
}

export async function renderReportPdf(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(data.title)
  const reg = await doc.embedFont(POPPINS_REGULAR_BASE64, { subset: true })
  const semi = await doc.embedFont(POPPINS_SEMIBOLD_BASE64, { subset: true })
  const bold = await doc.embedFont(POPPINS_BOLD_BASE64, { subset: true })

  let page: PDFPage
  let y = 0
  let pageNo = 0

  const newPage = () => {
    page = doc.addPage([PW, PH])
    pageNo++
    y = PH - M
    page.drawText('J.E Academy Science & Commerce', { x: M, y: 20, size: 7.5, font: reg, color: MUTED })
    page.drawText(`Page ${pageNo}`, { x: PW - M - 30, y: 20, size: 7.5, font: reg, color: MUTED })
  }
  const text = (s: string, x: number, size: number, font: PDFFont, color = TEXT) => page.drawText(s, { x, y, size, font, color })
  const fit = (s: string, w: number, font: PDFFont, size: number) => truncateToWidth(s, w, (t) => font.widthOfTextAtSize(t, size))

  newPage()
  page!.drawRectangle({ x: 0, y: PH - 78, width: PW, height: 78, color: INK })
  y = PH - 36
  text(data.title, M, 18, bold, rgb(1, 1, 1))
  y -= 18
  text(data.subtitle, M, 9, reg, rgb(0.82, 0.86, 0.94))
  y = PH - 78 - 26

  // summary tiles, two per row
  const tileW = (PW - 2 * M - 12) / 2
  data.summary.forEach(([label, value], i) => {
    const col = i % 2
    if (col === 0 && i > 0) y -= 46
    const x = M + col * (tileW + 12)
    page.drawRectangle({ x, y: y - 36, width: tileW, height: 40, color: BAND })
    page.drawText(label, { x: x + 10, y: y - 12, size: 7.5, font: reg, color: MUTED })
    page.drawText(fit(value, tileW - 20, bold, 12), { x: x + 10, y: y - 28, size: 12, font: bold, color: INK })
  })
  y -= data.summary.length ? 58 : 0

  const ROW = 15
  for (const table of data.tables) {
    const widths = scaled(table.columns)
    if (y - 70 < 40) newPage()
    y -= 6
    text(table.title, M, 11, semi, INK)
    y -= 8

    const drawHead = () => {
      page.drawRectangle({ x: M, y: y - 13, width: PW - 2 * M, height: 17, color: INK })
      let x = M
      table.columns.forEach((c, i) => {
        const w = widths[i]!
        const label = fit(c.label, w - 8, semi, 7.5)
        const tx = c.align === 'right' ? x + w - 4 - semi.widthOfTextAtSize(label, 7.5) : x + 4
        page.drawText(label, { x: tx, y: y - 8, size: 7.5, font: semi, color: rgb(1, 1, 1) })
        x += w
      })
      y -= 17
    }
    const drawRow = (cells: string[], opts: { bold?: boolean; band?: boolean }) => {
      if (opts.band) page.drawRectangle({ x: M, y: y - ROW + 4, width: PW - 2 * M, height: ROW, color: BAND })
      let x = M
      const font = opts.bold ? semi : reg
      table.columns.forEach((c, i) => {
        const w = widths[i]!
        const cell = fit(cells[i] ?? '', w - 8, font, 8)
        const tx = c.align === 'right' ? x + w - 4 - font.widthOfTextAtSize(cell, 8) : x + 4
        page.drawText(cell, { x: tx, y: y - 7, size: 8, font, color: TEXT })
        x += w
      })
      y -= ROW
    }

    drawHead()
    if (table.rows.length === 0) {
      text('Nothing recorded.', M + 4, 8.5, reg, MUTED)
      y -= ROW
    }
    table.rows.forEach((r, i) => {
      if (y - ROW < 40) { newPage(); drawHead() }
      drawRow(r, { band: i % 2 === 1 })
      page.drawLine({ start: { x: M, y: y + 4 }, end: { x: PW - M, y: y + 4 }, thickness: 0.3, color: RULE })
    })
    if (table.footer) {
      if (y - ROW < 40) newPage()
      drawRow(table.footer, { bold: true })
    }
    y -= 14
  }

  return doc.save()
}
