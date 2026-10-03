import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { ReportData } from './report-data'

// A real PDF with no browser dependency. The Puppeteer/Chromium path
// (lib/reports/pdf.ts) can't launch on Vercel's serverless runtime in this
// deployment, which used to leave every report downloading as an .html file;
// pdf-lib is pure JS with its fonts built in, so it behaves identically on
// Vercel, locally and for mobile's bearer-authed download. Colours are the
// CLAUDE.md §6 tokens; layout is a clean single-column report.

const C = {
  ink700: rgb(0.137, 0.2, 0.341),
  ink600: rgb(0.2, 0.275, 0.443),
  ink50: rgb(0.961, 0.965, 0.98),
  ink100: rgb(0.91, 0.922, 0.953),
  text: rgb(0.149, 0.133, 0.114),
  muted: rgb(0.576, 0.545, 0.502),
  rule: rgb(0.914, 0.902, 0.886),
  success: rgb(0.239, 0.443, 0.341),
  warning: rgb(0.663, 0.486, 0.176),
  danger: rgb(0.592, 0.247, 0.208),
}

const PAGE = { w: 595.28, h: 841.89 } // A4 in points
const M = 44
const CONTENT_W = PAGE.w - M * 2

const ATTENDANCE_LABEL: Record<string, string> = { present: 'Present', late: 'Late', absent: 'Absent' }

// Standard PDF fonts only cover WinAnsi — anything outside it (e.g. Urdu
// script in a name) would throw while drawing, so unsupported characters
// become '?' rather than failing the whole download.
function safe(text: string, font: PDFFont): string {
  let out = ''
  for (const ch of text) {
    try {
      font.encodeText(ch)
      out += ch
    } catch {
      out += '?'
    }
  }
  return out
}

function scoreColor(score: number, max: number) {
  const pct = (score / max) * 100
  return pct >= 80 ? C.success : pct >= 65 ? C.warning : C.danger
}

function statusColor(status: string) {
  return status === 'present' ? C.success : status === 'late' ? C.warning : C.danger
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatLogDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export async function renderReportPdf(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Progress Report — ${data.student.fullName}`)
  doc.setAuthor('JE Academy')
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)
  const monoBold = await doc.embedFont(StandardFonts.CourierBold)
  const serif = await doc.embedFont(StandardFonts.TimesRomanBoldItalic)

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h])
  let y = PAGE.h - M

  const newPage = () => {
    page = doc.addPage([PAGE.w, PAGE.h])
    y = PAGE.h - M
  }
  const ensure = (needed: number) => {
    if (y - needed < M + 20) newPage()
  }
  const text = (s: string, x: number, size: number, font: PDFFont, color = C.text) => {
    page.drawText(safe(s, font), { x, y, size, font, color })
  }
  const rightText = (s: string, rightX: number, size: number, font: PDFFont, color = C.text) => {
    const clean = safe(s, font)
    page.drawText(clean, { x: rightX - font.widthOfTextAtSize(clean, size), y, size, font, color })
  }
  const rule = (color = C.rule, thickness = 0.6) => {
    page.drawLine({ start: { x: M, y }, end: { x: PAGE.w - M, y }, thickness, color })
  }

  // Header
  text('JE Academy', M, 24, serif, C.ink700)
  rightText(`Generated ${formatDate(data.generatedAt)}`, PAGE.w - M, 9, mono, C.muted)
  y -= 16
  text('Student Progress Report', M, 10, regular, C.muted)
  y -= 12
  rule(C.ink700, 1.6)
  y -= 26

  // Student card
  const cardH = 62
  page.drawRectangle({ x: M, y: y - cardH + 18, width: CONTENT_W, height: cardH, color: C.ink50 })
  y -= 6
  text(data.student.fullName, M + 16, 16, bold, C.text)
  const tier = data.tier ?? 'Not yet evaluated'
  rightText(tier, PAGE.w - M - 16, 10, bold, data.tier === 'Below Pass' ? C.danger : data.tier === 'Pass' ? C.warning : data.tier ? C.success : C.muted)
  y -= 17
  text(`${data.student.rollNumber}  ·  ${data.student.program}  ·  Grade ${data.student.gradeLevel}-${data.student.section}  ·  Term ${data.term}`, M + 16, 9.5, mono, C.muted)
  y -= 44

  // Summary figures
  const colW = CONTENT_W / 2
  const stat = (x: number, label: string, value: string, note: string) => {
    page.drawText(label.toUpperCase(), { x, y, size: 8, font: bold, color: C.muted })
    page.drawText(safe(value, monoBold), { x, y: y - 26, size: 24, font: monoBold, color: C.ink700 })
    page.drawText(safe(note, regular), { x, y: y - 40, size: 9, font: regular, color: C.muted })
  }
  stat(M, 'Attendance', data.attendancePct !== null ? `${data.attendancePct}%` : '—', `${data.presentDays} present of ${data.totalDays} marked day${data.totalDays === 1 ? '' : 's'}`)
  stat(M + colW, 'Overall average', data.overallAverage !== null ? `${data.overallAverage}%` : '—', 'Across every mark this term')
  y -= 62
  rule()
  y -= 26

  // Marks
  text('Marks', M, 13, bold)
  y -= 20
  if (data.marksByExam.length === 0) {
    text(`No marks recorded for ${data.term} yet.`, M, 10, regular, C.muted)
    y -= 22
  }
  for (const group of data.marksByExam) {
    ensure(54)
    text(group.examType === 'custom' ? group.label.toUpperCase() : `${group.label.toUpperCase()} EXAM`, M, 9, bold, C.ink600)
    y -= 14
    page.drawRectangle({ x: M, y: y - 4, width: CONTENT_W, height: 18, color: C.ink100 })
    y += 1
    text('SUBJECT', M + 8, 8, bold, C.muted)
    text('SCORE', M + CONTENT_W - 150, 8, bold, C.muted)
    text('GRADE', M + CONTENT_W - 50, 8, bold, C.muted)
    y -= 20
    for (const row of group.rows) {
      ensure(22)
      text(row.subject.length > 52 ? `${row.subject.slice(0, 51)}…` : row.subject, M + 8, 10, regular, C.text)
      text(`${row.score}/${row.maxScore}`, M + CONTENT_W - 150, 10, monoBold, scoreColor(row.score, row.maxScore))
      text(row.grade, M + CONTENT_W - 50, 10, monoBold, C.ink700)
      y -= 6
      rule()
      y -= 14
    }
    y -= 8
  }

  // Attendance log
  ensure(70)
  y -= 6
  text('Attendance Record', M, 13, bold)
  y -= 20
  if (data.attendanceLog.length === 0) {
    text('No attendance recorded yet.', M, 10, regular, C.muted)
    y -= 20
  }
  for (const month of data.attendanceLog) {
    ensure(40)
    text(month.label.toUpperCase(), M, 9, bold, C.ink600)
    y -= 15
    const cellW = 96
    const perRow = Math.floor(CONTENT_W / cellW)
    month.rows.forEach((r, i) => {
      const col = i % perRow
      if (col === 0 && i > 0) {
        y -= 14
        ensure(16)
      }
      page.drawText(safe(`${formatLogDate(r.date)} ${ATTENDANCE_LABEL[r.status] ?? r.status}`, mono), {
        x: M + col * cellW, y, size: 8.5, font: mono, color: statusColor(r.status),
      })
    })
    y -= 24
  }

  // Footer on every page
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    const label = `JE Academy · Progress Report · ${safe(data.student.fullName, regular)} · Page ${i + 1} of ${pages.length}`
    p.drawText(label, { x: M, y: 24, size: 8, font: regular, color: C.muted })
  })

  return doc.save()
}
