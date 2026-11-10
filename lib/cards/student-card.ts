import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { ACADEMY_PHONE, CARD_NOTE, CARD_TERMS, orDash, truncateToWidth, wrapText, type StudentCardData } from './card-data'
import { POPPINS_BOLD_BASE64, POPPINS_MEDIUM_BASE64, POPPINS_REGULAR_BASE64, POPPINS_SEMIBOLD_BASE64 } from './poppins-data'
import { WATERMARK_PNG_BASE64 } from './watermark-data'
import { GELASIO_BOLD_BASE64, GELASIO_REGULAR_BASE64 } from './brand-font-data'

// The J.E Academy student ID card: portrait, two pages (front, back), the same
// size and layout as the school's own design (a Canva export, 141.75 x 240.75 pt
// ≈ 50 x 85 mm). Positions below were measured from that sample, in PDF points
// with the origin at the top-left (shapes) or bottom-left (text baselines).

const W = 141.75
const H = 240.75

const DARK = rgb(0.075, 0.322, 0.6) // #135299 bands and bars
const LIGHT = rgb(0.365, 0.58, 0.8) // #5D94CC corner triangles
const BADGE = rgb(0.094, 0.376, 0.69) // #1860B0
const INK = rgb(0.071, 0.133, 0.227) // #12223A
const TEXT = rgb(0.17, 0.2, 0.27)
const ARC = rgb(0.78, 0.86, 0.945)
const NOTE = rgb(0.66, 0.78, 0.93)
const GREY = rgb(0.85, 0.85, 0.85)

// SVG-style path: y grows downward from the page's top-left corner.
const shape = (page: PDFPage, d: string, color: ReturnType<typeof rgb>) => page.drawSvgPath(d, { x: 0, y: H, color, borderWidth: 0 })
const stroke = (page: PDFPage, d: string) => page.drawSvgPath(d, { x: 0, y: H, borderColor: ARC, borderWidth: 1.3 })

function chrome(page: PDFPage, side: 'front' | 'back') {
  if (side === 'front') {
    shape(page, 'M0 0 L11.7 0 L11.7 106 L0 123.9 Z', DARK)
    shape(page, 'M11.7 0 L32 0 L11.7 19.5 Z', LIGHT)
    stroke(page, 'M104 50 Q 118 66 141.75 63')
  } else {
    shape(page, 'M0 0 L141.75 0 L141.75 11.2 L0 11.2 Z', DARK)
    shape(page, 'M0 11.2 L22.3 11.2 L0 34.6 Z', LIGHT)
    stroke(page, 'M104 45 Q 118 61 141.75 58')
  }
  stroke(page, 'M0 193 Q 14 200 26 215')
  shape(page, `M0 229.05 L${W} 229.05 L${W} ${H} L0 ${H} Z`, DARK)
  shape(page, `M${W} 208.7 L${W} ${H} L110.5 ${H} Z`, LIGHT)
}

export async function renderStudentCardPdf(data: StudentCardData): Promise<Uint8Array> {
  return renderStudentCardsPdf([data])
}

// One PDF holding any number of cards, each as a front page followed by its back
// page (so a duplex printer puts both sides on one sheet). Fonts and the emblem
// are embedded once for the whole document.
export async function renderStudentCardsPdf(cards: StudentCardData[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(cards.length === 1 ? `Student ID Card — ${cards[0].fullName}` : `Student ID Cards (${cards.length})`)
  doc.setAuthor('J.E ACADEMY')

  const bold = await doc.embedFont(POPPINS_BOLD_BASE64, { subset: true })
  const semi = await doc.embedFont(POPPINS_SEMIBOLD_BASE64, { subset: true })
  const medium = await doc.embedFont(POPPINS_MEDIUM_BASE64, { subset: true })
  const regular = await doc.embedFont(POPPINS_REGULAR_BASE64, { subset: true })
  // The academy name at the top is set in Gelasio, an open-licence typeface made to match Georgia.
  const titleFont = await doc.embedFont(GELASIO_BOLD_BASE64, { subset: true })
  const taglineFont = await doc.embedFont(GELASIO_REGULAR_BASE64, { subset: true })
  const watermark = await doc.embedPng(WATERMARK_PNG_BASE64)

  // Standard-font-style safety: a character the font lacks (e.g. Urdu script in a
  // name) must not fail the whole download, so unsupported characters become '?'.
  const safe = (s: string, font: PDFFont): string => {
    let out = ''
    for (const ch of s) {
      try { font.encodeText(ch); out += ch } catch { out += '?' }
    }
    return out
  }
  const text = (page: PDFPage, s: string, x: number, y: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(safe(s, font), { x, y, size, font, color })
  const centered = (page: PDFPage, s: string, y: number, size: number, font: PDFFont, color = INK) => {
    const clean = safe(s, font)
    page.drawText(clean, { x: (W - font.widthOfTextAtSize(clean, size)) / 2, y, size, font, color })
  }
  // Largest size (≤ max) at which the text fits `width`.
  const fit = (s: string, font: PDFFont, max: number, width: number, min = 5) => {
    const clean = safe(s, font)
    let size = max
    while (size > min && font.widthOfTextAtSize(clean, size) > width) size -= 0.25
    return size
  }

  // The academy emblem, large and faint, behind everything on the page. Drawn first, so the card's own blue
  // bands, the photo and the text all sit on top of it.
  const WM = 156
  const stamp = (page: PDFPage) =>
    page.drawImage(watermark, { x: (W - WM) / 2, y: (H - WM) / 2 - 14, width: WM, height: WM, opacity: 0.11 })

  // The brand block at the top of each page: the emblem at the left, the academy name beside it.
  const LOGO = 34, GAP = 5, LOGO_X = 16
  const TEXT_X = LOGO_X + LOGO + GAP
  const TEXT_W = W - TEXT_X - 5
  const brand = (page: PDFPage, dy: number) => {
    const y0 = 203.4 - dy
    page.drawImage(watermark, { x: LOGO_X, y: y0, width: LOGO, height: LOGO })
    const titleSize = fit('JE ACADEMY', titleFont, 10.6, TEXT_W)
    const tagSize = fit('SCIENCE & COMMERCE', taglineFont, 5.7, TEXT_W)
    text(page, 'JE ACADEMY', TEXT_X, y0 + LOGO / 2 + 2.6, titleSize, titleFont)
    text(page, 'SCIENCE & COMMERCE', TEXT_X, y0 + LOGO / 2 - 7, tagSize, taglineFont)
  }

  for (const data of cards) {
  // ---- Front ------------------------------------------------------------------
  const front = doc.addPage([W, H])
  stamp(front)
  chrome(front, 'front')
  brand(front, 0)

  // Photo frame 58.6 x 70.3 (5:6), the processed upload fills it exactly.
  const PX = 41.9, PY = 129.4, PW = 58.6, PH = 70.3
  if (data.photoJpeg) {
    const photo = await doc.embedJpg(data.photoJpeg)
    front.drawImage(photo, { x: PX, y: PY, width: PW, height: PH })
  } else {
    front.drawRectangle({ x: PX, y: PY, width: PW, height: PH, color: GREY })
    // head-and-shoulders silhouette kept inside the frame so an empty frame reads as "photo pending"
    const sil = rgb(0.7, 0.7, 0.7)
    const cx = PX + PW / 2
    const bottom = H - PY // frame bottom edge in SVG (top-down) coordinates
    front.drawEllipse({ x: cx, y: PY + PH * 0.64, xScale: 11, yScale: 12.5, color: sil })
    front.drawSvgPath(
      `M${PX + 7} ${bottom} C${PX + 7} ${bottom - 20} ${cx - 16} ${bottom - 27} ${cx} ${bottom - 27} C${cx + 16} ${bottom - 27} ${PX + PW - 7} ${bottom - 20} ${PX + PW - 7} ${bottom} Z`,
      { x: 0, y: H, color: sil, borderWidth: 0 },
    )
  }
  front.drawRectangle({ x: PX, y: PY, width: PW, height: PH, borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.5 })

  // Name: one line at 13.24 pt; shrinks to fit 118 pt, then wraps to two lines.
  const NAME_W = 118
  const nameSize1 = fit(data.fullName, bold, 13.24, NAME_W, 9.5)
  if (bold.widthOfTextAtSize(safe(data.fullName, bold), nameSize1) <= NAME_W) {
    centered(front, data.fullName, 111.9, nameSize1, bold)
  } else {
    const lines = wrapText(safe(data.fullName, bold), NAME_W, (s) => bold.widthOfTextAtSize(s, 9.5)).slice(0, 2)
    centered(front, lines[0], 120.3, fit(lines[0], bold, 9.5, NAME_W), bold)
    if (lines[1]) centered(front, lines[1], 110.4, fit(lines[1], bold, 9.5, NAME_W), bold)
  }

  // "Student" badge
  const badgeW = semi.widthOfTextAtSize('Student', 5.88) + 7
  front.drawRectangle({ x: (W - badgeW) / 2, y: 93.9, width: badgeW, height: 12.2, color: BADGE })
  centered(front, 'Student', 98.5, 5.88, semi, rgb(1, 1, 1))

  // Father's name and the group come first, then the registration and GR numbers, the class and the contact.
  const rows: [string, string][] = [
    ['Father', orDash(data.parentName)],
    ['Group', orDash(data.group)],
    ['Reg No', orDash(data.registrationNumber)],
    ['GR No', orDash(data.grNumber)],
    ['Grade', orDash(data.gradeLabel)],
    ['Section', orDash(data.section)],
    ['Validity', `Session ${data.session}`],
  ]
  const ROW_TOP = 83.2, ROW_STEP = 9.6
  const VALUE_W = W - 43.6 - 6
  rows.forEach(([label, value], i) => {
    const y = ROW_TOP - i * ROW_STEP
    text(front, label, 14.4, y, 5.6, semi, INK)
    const v = truncateToWidth(`: ${safe(value, medium)}`, VALUE_W, (s) => medium.widthOfTextAtSize(s, 5.6))
    text(front, v, 43.6, y, 5.6, medium, TEXT)
  })

  // ---- Back -------------------------------------------------------------------
  const back = doc.addPage([W, H])
  stamp(back)
  chrome(back, 'back')
  brand(back, 14.5)
  centered(back, 'TERMS AND', 170.9, 8.23, bold)
  centered(back, 'CONDITIONS', 161.4, 8.23, bold)

  let y = 145.4
  for (const term of CARD_TERMS) {
    const lines = wrapText(term, 128, (s) => regular.widthOfTextAtSize(s, 4.53))
    back.drawCircle({ x: 8.3, y: y + 1.6, size: 0.9, color: rgb(0.1, 0.1, 0.1) })
    for (const line of lines) {
      text(back, line, 12.2, y, 4.53, regular, rgb(0.1, 0.13, 0.2))
      y -= 6.05
    }
  }
  const noteLines = wrapText(CARD_NOTE, 120, (s) => bold.widthOfTextAtSize(s, 5.6))
  noteLines.forEach((l, i) => centered(back, l, 53.2 - i * 7.5, 5.6, bold, NOTE))
  centered(back, `Phone: ${ACADEMY_PHONE}`, 53.2 - noteLines.length * 7.5 - 5.5, 7, bold, INK)
  }

  return doc.save()
}
