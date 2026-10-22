import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { CARD_NOTE, CARD_TERMS, wrapText, type StudentCardData } from './card-data'
import { POPPINS_BOLD_BASE64, POPPINS_MEDIUM_BASE64, POPPINS_REGULAR_BASE64, POPPINS_SEMIBOLD_BASE64 } from './poppins-data'
import { EMBLEM_JPEG_BASE64 } from './emblem-data'

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
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(`Student ID Card — ${data.fullName}`)
  doc.setAuthor('J.E ACADEMY')

  const bold = await doc.embedFont(POPPINS_BOLD_BASE64, { subset: true })
  const semi = await doc.embedFont(POPPINS_SEMIBOLD_BASE64, { subset: true })
  const medium = await doc.embedFont(POPPINS_MEDIUM_BASE64, { subset: true })
  const regular = await doc.embedFont(POPPINS_REGULAR_BASE64, { subset: true })
  const emblem = await doc.embedJpg(EMBLEM_JPEG_BASE64)

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

  const brand = (page: PDFPage, dy: number) => {
    page.drawImage(emblem, { x: 37.5, y: 210.5 - dy, width: 23, height: 23 })
    text(page, 'JE ACADEMY', 64.7, 221.7 - dy, fit('JE ACADEMY', semi, 4.91, 31), semi)
    text(page, 'SCIENCE & COMMERCE', 64.7, 218.1 - dy, fit('SCIENCE & COMMERCE', medium, 2.91, 32.2), medium)
  }

  // ---- Front ------------------------------------------------------------------
  const front = doc.addPage([W, H])
  chrome(front, 'front')
  brand(front, 0)

  // Photo frame 58.6 x 70.3 (5:6), the processed upload fills it exactly.
  const PX = 41.9, PY = 133.6, PW = 58.6, PH = 70.3
  if (data.photoJpeg) {
    const photo = await doc.embedJpg(data.photoJpeg)
    front.drawImage(photo, { x: PX, y: PY, width: PW, height: PH })
  } else {
    front.drawRectangle({ x: PX, y: PY, width: PW, height: PH, color: GREY })
    // plain head-and-shoulders silhouette so an empty frame reads as "photo pending"
    front.drawEllipse({ x: PX + PW / 2, y: PY + PH * 0.62, xScale: 11, yScale: 13, color: rgb(0.7, 0.7, 0.7) })
    front.drawEllipse({ x: PX + PW / 2, y: PY + PH * 0.05, xScale: 22, yScale: 21, color: rgb(0.7, 0.7, 0.7) })
    centered(front, 'PHOTO', PY + 5, 4.5, semi, rgb(0.45, 0.45, 0.45))
  }
  front.drawRectangle({ x: PX, y: PY, width: PW, height: PH, borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.5 })

  // Name: one line at 13.24 pt; shrinks to fit 118 pt, then wraps to two lines.
  const NAME_W = 118
  const nameSize1 = fit(data.fullName, bold, 13.24, NAME_W, 9.5)
  if (bold.widthOfTextAtSize(safe(data.fullName, bold), nameSize1) <= NAME_W) {
    centered(front, data.fullName, 116.1, nameSize1, bold)
  } else {
    const lines = wrapText(safe(data.fullName, bold), NAME_W, (s) => bold.widthOfTextAtSize(s, 9.5)).slice(0, 2)
    centered(front, lines[0], 124.5, fit(lines[0], bold, 9.5, NAME_W), bold)
    if (lines[1]) centered(front, lines[1], 114.6, fit(lines[1], bold, 9.5, NAME_W), bold)
  }

  // "Student" badge
  const badgeW = semi.widthOfTextAtSize('Student', 5.88) + 7
  front.drawRectangle({ x: (W - badgeW) / 2, y: 98.1, width: badgeW, height: 12.2, color: BADGE })
  centered(front, 'Student', 102.7, 5.88, semi, rgb(1, 1, 1))

  const rows: [string, string, number][] = [
    ['GR No', data.grNumber, 84.0],
    ['Grade', data.gradeLabel, 72.9],
    ['Section', data.section, 61.9],
    ['Validity', `Session ${data.session}`, 50.8],
  ]
  for (const [label, value, y] of rows) {
    text(front, label, 16.4, y, 6.11, semi, INK)
    const v = `: ${value}`
    text(front, v, 43.6, y, fit(v, medium, 6.11, W - 43.6 - 8), medium, TEXT)
  }

  // ---- Back -------------------------------------------------------------------
  const back = doc.addPage([W, H])
  chrome(back, 'back')
  brand(back, 16.2)
  centered(back, 'TERMS AND', 177.9, 8.23, bold)
  centered(back, 'CONDITIONS', 168.4, 8.23, bold)

  let y = 151.9
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

  return doc.save()
}
