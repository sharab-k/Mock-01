import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { gradeTone } from '@/lib/marks/letter-grade'
import type { ReportData } from './report-data'
import { LOGO_PNG_BASE64 } from './logo'

// A real PDF with no browser dependency. The Puppeteer/Chromium path
// (lib/reports/pdf.ts) can't launch on Vercel's serverless runtime in this
// deployment, which used to leave every report downloading as an .html file;
// pdf-lib is pure JS with its fonts built in, so it behaves identically on
// Vercel, locally and for mobile's bearer-authed download. Colours are the
// CLAUDE.md §6 tokens; layout is a clean single-column report.

// The school's name exactly as it is to be printed on every report.
export const SCHOOL_NAME = 'J.E ACADEMY'

const C = {
  ink700: rgb(0.137, 0.2, 0.341),
  ink600: rgb(0.2, 0.275, 0.443),
  ink50: rgb(0.961, 0.965, 0.98),
  ink100: rgb(0.91, 0.922, 0.953),
  white: rgb(1, 1, 1),
  text: rgb(0.149, 0.133, 0.114),
  muted: rgb(0.576, 0.545, 0.502),
  rule: rgb(0.914, 0.902, 0.886),
  success: rgb(0.239, 0.443, 0.341),
  successBg: rgb(0.918, 0.961, 0.941),
  warning: rgb(0.663, 0.486, 0.176),
  danger: rgb(0.592, 0.247, 0.208),
  dangerBg: rgb(0.969, 0.922, 0.914),
}

const PAGE = { w: 595.28, h: 841.89 } // A4 in points
const M = 44
const CONTENT_W = PAGE.w - M * 2

const GRADE_COLOR = { success: C.success, ink: C.ink700, warning: C.warning, danger: C.danger } as const

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

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatExamDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
}

function formatLogDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`
}

const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

export async function renderReportPdf(data: ReportData): Promise<Uint8Array> {
  const month = data.reportMonth.label
  const doc = await PDFDocument.create()
  const isMonth = data.scope === 'month'
  doc.setTitle(`${isMonth ? 'Monthly' : 'Full'} Progress Report — ${data.student.fullName} — ${month}`)
  doc.setAuthor(SCHOOL_NAME)
  doc.setSubject(`Student progress report for ${month}`)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)
  const monoBold = await doc.embedFont(StandardFonts.CourierBold)
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold)
  const logo = await doc.embedPng(LOGO_PNG_BASE64)

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h])
  let y = PAGE.h - M

  const newPage = () => {
    page = doc.addPage([PAGE.w, PAGE.h])
    y = PAGE.h - M
  }
  const ensure = (needed: number) => {
    if (y - needed < M + 24) newPage()
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
  const sectionTitle = (title: string, note?: string) => {
    ensure(120) // keep the heading with at least its first block
    text(title, M, 13, bold)
    if (note) rightText(note, PAGE.w - M, 9, regular, C.muted)
    y -= 8
    rule(C.ink700, 1)
    y -= 18
  }

  // ---- Header ---------------------------------------------------------------
  const LOGO_H = 46
  const LOGO_W = (logo.width / logo.height) * LOGO_H
  page.drawImage(logo, { x: M, y: y - LOGO_H + 14, width: LOGO_W, height: LOGO_H })
  const TX = M + LOGO_W + 12
  text(SCHOOL_NAME, TX, 26, serif, C.ink700)
  rightText(`Generated ${formatDate(data.generatedAt)}`, PAGE.w - M, 9, mono, C.muted)
  y -= 17
  text(isMonth ? 'STUDENT PROGRESS REPORT  ·  CURRENT MONTH' : 'STUDENT PROGRESS REPORT  ·  FULL RECORD', TX, 9.5, bold, C.muted)
  y -= 40
  // The month this report is for, front and centre.
  page.drawRectangle({ x: M, y: y - 8, width: CONTENT_W, height: 28, color: C.ink700 })
  y += 2
  text(isMonth ? `Progress report for the month of ${month}` : `Full progress report  ·  up to ${month}`, M + 14, 13, bold, C.white)
  rightText(isMonth ? "This month's attendance, marks and fee" :'Complete record to the end of this month', PAGE.w - M - 14, 8.5, regular, C.ink100)
  y -= 36

  // ---- Student card ------------------------------------------------------------
  const cardH = 62
  page.drawRectangle({ x: M, y: y - cardH + 18, width: CONTENT_W, height: cardH, color: C.ink50 })
  y -= 6
  text(data.student.fullName, M + 16, 16, bold, C.text)
  const tier = data.tier ?? 'Not yet evaluated'
  rightText(tier, PAGE.w - M - 16, 10, bold, data.tier === 'Below Pass' ? C.danger : data.tier === 'Pass' ? C.warning : data.tier ? C.success : C.muted)
  y -= 17
  const ids = [data.student.rollNumber, data.student.grNumber ? `GR ${data.student.grNumber}` : null, data.student.program, `Grade ${data.student.gradeLevel}-${data.student.section}`].filter(Boolean).join('  ·  ')
  text(ids, M + 16, 9.5, mono, C.muted)
  y -= 44

  // ---- Summary figures ----------------------------------------------------------
  const colW = CONTENT_W / (isMonth ? 3 : 4)
  const stat = (i: number, label: string, value: string, note: string) => {
    const x = M + colW * i
    page.drawText(safe(label.toUpperCase(), bold), { x, y, size: 7.5, font: bold, color: C.muted })
    page.drawText(safe(value, monoBold), { x, y: y - 24, size: 21, font: monoBold, color: C.ink700 })
    page.drawText(safe(note, regular), { x, y: y - 37, size: 8.5, font: regular, color: C.muted })
  }
  const pct = (v: number | null) => (v !== null ? `${v}%` : '—')
  const monthName = data.reportMonth.label.split(' ')[0]
  const monthMarkCount = data.marksByMonth.filter((b) => b.isReportMonth).reduce((n, b) => n + b.rows.length, 0)
  const thisMonthFee = data.fees.lines.find((l) => l.isReportMonth)
  stat(0, `Attendance · ${monthName}`, pct(data.monthAttendancePct), `${data.monthPresentDays} of ${data.monthTotalDays} day${data.monthTotalDays === 1 ? '' : 's'}`)
  if (isMonth) {
    stat(1, `Average · ${monthName}`, pct(data.monthAverage), `${monthMarkCount} mark${monthMarkCount === 1 ? '' : 's'} this month`)
    stat(2, `Fee · ${monthName}`, thisMonthFee ? (thisMonthFee.status === 'paid' ? 'PAID' : 'UNPAID') : '—', data.fees.monthlyFee ? `Monthly fee Rs ${data.fees.monthlyFee.toLocaleString('en-US')}` : 'Fee for this month')
  } else {
    stat(1, 'Attendance · to date', pct(data.attendancePct), `${data.presentDays} of ${data.totalDays} day${data.totalDays === 1 ? '' : 's'}`)
    stat(2, `Average · ${monthName}`, pct(data.monthAverage), 'Exams held this month')
    stat(3, 'Average · to date', pct(data.overallAverage), 'Every mark so far')
  }
  y -= 58
  rule()
  y -= 24

  // ---- Marks ---------------------------------------------------------------------
  sectionTitle('Marks', isMonth ? `Exams held in ${month}` : 'Every exam, with the date it was held')
  if (data.marksByMonth.length === 0) {
    text(isMonth ? `No marks recorded for ${month}.` : 'No marks recorded yet.', M, 10, regular, C.muted)
    y -= 24
  }
  const XD = M + 8, XS = M + 92, XE = M + 232, XSC = M + CONTENT_W - 118, XG = M + CONTENT_W - 46
  for (const block of data.marksByMonth) {
    ensure(64)
    page.drawRectangle({ x: M, y: y - 5, width: CONTENT_W, height: 18, color: block.isReportMonth ? C.ink100 : C.ink50 })
    text(block.label.toUpperCase() + (block.isReportMonth ? '  ·  THIS REPORT\'S MONTH' : ''), M + 8, 9, bold, C.ink600)
    if (block.average !== null) rightText(`Average ${block.average}%`, PAGE.w - M - 8, 9, bold, C.ink600)
    y -= 18
    text('DATE', XD, 7.5, bold, C.muted)
    text('SUBJECT', XS, 7.5, bold, C.muted)
    text('EXAM', XE, 7.5, bold, C.muted)
    text('SCORE', XSC, 7.5, bold, C.muted)
    text('GRADE', XG, 7.5, bold, C.muted)
    y -= 14
    for (const row of block.rows) {
      ensure(22)
      text(formatExamDate(row.date), XD, 9, mono, C.muted)
      text(clip(row.subject, 24), XS, 10, regular, C.text)
      text(clip(row.exam, 22), XE, 9.5, regular, C.muted)
      text(`${row.score}/${row.maxScore}`, XSC, 10, monoBold, scoreColor(row.score, row.maxScore))
      text(row.grade, XG, 10, monoBold, GRADE_COLOR[gradeTone(row.grade)])
      y -= 5
      rule()
      y -= 13
    }
    y -= 8
  }

  // ---- Attendance ------------------------------------------------------------------
  y -= 4
  sectionTitle('Attendance Record', isMonth ? `Every day in ${month}` : 'Every day, month by month')
  if (data.attendanceMonths.length === 0) {
    text(isMonth ? `No attendance recorded for ${month}.` : 'No attendance recorded yet.', M, 10, regular, C.muted)
    y -= 24
  }
  for (const block of data.attendanceMonths) {
    ensure(50)
    page.drawRectangle({ x: M, y: y - 5, width: CONTENT_W, height: 18, color: block.isReportMonth ? C.ink100 : C.ink50 })
    text(block.label.toUpperCase() + (block.isReportMonth ? '  ·  THIS REPORT\'S MONTH' : ''), M + 8, 9, bold, C.ink600)
    const attended = block.present + block.late
    rightText(`P ${block.present}  L ${block.late}  A ${block.absent}  ·  ${block.total ? Math.round((attended / block.total) * 100) : 0}%`, PAGE.w - M - 8, 8.5, mono, C.ink600)
    y -= 22
    const cellW = 96
    const perRow = Math.floor(CONTENT_W / cellW)
    block.rows.forEach((r, i) => {
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

  // ---- Fee record ----------------------------------------------------------------------
  y -= 4
  const f = data.fees
  sectionTitle('Fee Record', f.lines.length ? `Every month since enrolment  ·  ${f.paidCount} of ${f.lines.length} paid${f.monthlyFee ? `  ·  Monthly fee Rs ${f.monthlyFee.toLocaleString('en-US')}` : ''}` : undefined)
  if (f.lines.length === 0) {
    text('No fee months to show.', M, 10, regular, C.muted)
    y -= 24
  }
  const XM = M + 8, XST = M + CONTENT_W - 90
  if (f.lines.length > 0) {
    text('MONTH', XM, 7.5, bold, C.muted)
    text('STATUS', XST, 7.5, bold, C.muted)
    y -= 14
  }
  for (const line of f.lines) {
    ensure(24)
    if (line.isReportMonth) page.drawRectangle({ x: M, y: y - 6, width: CONTENT_W, height: 18, color: C.ink50 })
    text(line.label + (line.isReportMonth ? '   (this report\'s month)' : ''), XM, 10, line.isReportMonth ? bold : regular, C.text)
    page.drawRectangle({ x: XST - 6, y: y - 4, width: 62, height: 15, color: line.status === 'paid' ? C.successBg : C.dangerBg })
    text(line.status === 'paid' ? 'PAID' : 'UNPAID', XST + 6, 9, bold, line.status === 'paid' ? C.success : C.danger)
    y -= 6
    rule()
    y -= 13
  }

  // ---- Footer on every page ----------------------------------------------------------------
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    const label = `${SCHOOL_NAME}  ·  ${isMonth ? 'Monthly' : 'Full'} Progress Report  ·  ${safe(data.student.fullName, regular)}  ·  ${month}  ·  Page ${i + 1} of ${pages.length}`
    p.drawText(label, { x: M, y: 24, size: 8, font: regular, color: C.muted })
  })

  return doc.save()
}
