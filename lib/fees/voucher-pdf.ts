import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { POPPINS_BOLD_BASE64, POPPINS_REGULAR_BASE64, POPPINS_SEMIBOLD_BASE64 } from '@/lib/cards/poppins-data'
import { truncateToWidth, wrapText } from '@/lib/cards/card-data'

export type VoucherLine = { label: string; amount: number }

export type VoucherData = {
  voucherNo: number
  studentName: string
  grNumber: string | null
  rollNumber: string
  grade: string
  section: string
  periodLabel: string          // e.g. "November 2026"
  dueDate: string              // YYYY-MM-DD
  lines: VoucherLine[]         // charges, before discount
  discount: number
  total: number                // due after discount
  paid: number
  outstanding: number
  statusLabel: string          // Paid / Unpaid / Partially paid / Overdue
}

// One landscape A4 page per voucher, with three identical copies side by side
// (Student, Academy, Bank) so the sheet is cut into three. Callers pass vouchers
// already ordered class by class and section by section; this just prints them.
const PW = 841.89
const PH = 595.28
const COPIES = ['Student copy', 'Academy copy', 'Bank copy'] as const
const M = 18
const GAP = 14
const COL_W = (PW - 2 * M - 2 * GAP) / 3

const INK = rgb(0.137, 0.2, 0.341)
const TEXT = rgb(0.15, 0.13, 0.11)
const MUTED = rgb(0.45, 0.42, 0.38)
const RULE = rgb(0.82, 0.8, 0.77)

const rs = (n: number) => `Rs ${n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`

type Fonts = { reg: PDFFont; semi: PDFFont; bold: PDFFont }

function drawCopy(page: PDFPage, x: number, v: VoucherData, copy: string, f: Fonts) {
  const w = COL_W
  const top = PH - M
  page.drawRectangle({ x, y: M, width: w, height: PH - 2 * M, borderColor: RULE, borderWidth: 0.8 })
  page.drawRectangle({ x, y: top - 44, width: w, height: 44, color: INK })
  page.drawText('J.E Academy Science & Commerce', { x: x + 10, y: top - 19, size: 11, font: f.bold, color: rgb(1, 1, 1) })
  page.drawText(`Fee voucher  ·  ${copy}`, { x: x + 10, y: top - 34, size: 8, font: f.reg, color: rgb(0.85, 0.88, 0.95) })

  let y = top - 66
  const row = (label: string, value: string) => {
    page.drawText(label, { x: x + 10, y, size: 7.5, font: f.reg, color: MUTED })
    page.drawText(truncateToWidth(value, w - 20 - 70, (t) => f.semi.widthOfTextAtSize(t, 9)), { x: x + 80, y, size: 9, font: f.semi, color: TEXT })
    y -= 15
  }
  row('Voucher no.', `#${v.voucherNo}`)
  row('Student', v.studentName)
  row('GR no.', v.grNumber ?? '—')
  row('Roll no.', v.rollNumber)
  row('Class', `${v.grade}  ·  Section ${v.section}`)
  row('For', v.periodLabel)
  row('Due date', v.dueDate)

  y -= 6
  page.drawLine({ start: { x: x + 10, y }, end: { x: x + w - 10, y }, thickness: 0.6, color: RULE })
  y -= 14
  page.drawText('FEE DETAILS', { x: x + 10, y, size: 7.5, font: f.semi, color: MUTED })
  y -= 14

  const amountRight = x + w - 10
  const line = (label: string, amount: string, bold = false) => {
    const font = bold ? f.bold : f.reg
    const labelLines = wrapText(label, w - 20 - 80, (t) => font.widthOfTextAtSize(t, 9)).slice(0, 2)
    labelLines.forEach((l, i) => page.drawText(l, { x: x + 10, y: y - i * 11, size: 9, font, color: TEXT }))
    page.drawText(amount, { x: amountRight - font.widthOfTextAtSize(amount, 9), y, size: 9, font, color: TEXT })
    y -= labelLines.length * 11 + 4
  }
  const shown = v.lines.slice(0, 8)
  for (const l of shown) line(l.label, rs(l.amount))
  if (v.lines.length > shown.length) line(`+ ${v.lines.length - shown.length} more`, '')
  if (v.discount > 0) line('Discount', `- ${rs(v.discount)}`)

  page.drawLine({ start: { x: x + 10, y: y + 2 }, end: { x: x + w - 10, y: y + 2 }, thickness: 0.6, color: RULE })
  y -= 10
  line('Total due', rs(v.total), true)
  if (v.paid > 0) line('Paid', rs(v.paid))
  line('Payable', rs(v.outstanding), true)

  y -= 6
  page.drawRectangle({ x: x + 10, y: y - 16, width: w - 20, height: 20, color: v.outstanding === 0 ? rgb(0.92, 0.96, 0.94) : rgb(0.97, 0.94, 0.89) })
  page.drawText(`Status: ${v.statusLabel}`, { x: x + 16, y: y - 10, size: 9, font: f.semi, color: v.outstanding === 0 ? rgb(0.24, 0.44, 0.34) : rgb(0.66, 0.49, 0.18) })

  page.drawLine({ start: { x: x + 10, y: M + 44 }, end: { x: x + w / 2 - 6, y: M + 44 }, thickness: 0.6, color: MUTED })
  page.drawText('Received by / stamp', { x: x + 10, y: M + 33, size: 7, font: f.reg, color: MUTED })
  page.drawText('Pay before the due date. Keep this copy.', { x: x + 10, y: M + 14, size: 6.8, font: f.reg, color: MUTED })
}

export async function renderVouchersPdf(vouchers: VoucherData[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(vouchers.length === 1 ? `Fee voucher #${vouchers[0]?.voucherNo}` : `Fee vouchers (${vouchers.length})`)
  const fonts: Fonts = {
    reg: await doc.embedFont(POPPINS_REGULAR_BASE64, { subset: true }),
    semi: await doc.embedFont(POPPINS_SEMIBOLD_BASE64, { subset: true }),
    bold: await doc.embedFont(POPPINS_BOLD_BASE64, { subset: true }),
  }
  for (const v of vouchers) {
    const page = doc.addPage([PW, PH])
    COPIES.forEach((copy, i) => drawCopy(page, M + i * (COL_W + GAP), v, copy, fonts))
  }
  return doc.save()
}
