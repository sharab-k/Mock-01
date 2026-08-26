import type { ReportData } from './report-data'

// CLAUDE.md §6 tokens, inlined as hex — this HTML is rendered standalone by
// Puppeteer, outside the app's Tailwind build, so the design system's values
// are reproduced directly rather than referenced by class name.
const TOKENS = {
  ink700: '#233357',
  ink600: '#334671',
  ink100: '#E8EBF3',
  ink50: '#F5F6FA',
  neutral900: '#26221D',
  neutral700: '#5A5349',
  neutral500: '#938B80',
  neutral300: '#D6D2CC',
  neutral200: '#E9E6E2',
  neutral100: '#F5F4F2',
  neutral50: '#FBFAF9',
  success: '#3D7157',
  successBg: '#EAF5F0',
  warning: '#A97C2D',
  warningBg: '#F7F0E3',
  danger: '#973F35',
  dangerBg: '#F7EBE9',
}

const TIER_COLOR: Record<string, { text: string; bg: string }> = {
  Distinction: { text: TOKENS.success, bg: TOKENS.successBg },
  Merit: { text: TOKENS.ink600, bg: TOKENS.ink50 },
  Pass: { text: TOKENS.warning, bg: TOKENS.warningBg },
  'Below Pass': { text: TOKENS.danger, bg: TOKENS.dangerBg },
}

function scoreColor(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100
  if (pct >= 80) return TOKENS.success
  if (pct >= 65) return TOKENS.warning
  return TOKENS.danger
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatLogDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

const ATTENDANCE_LABEL: Record<string, string> = { present: 'Present', late: 'Late', absent: 'Absent' }
function attendanceStatusColor(status: string): { text: string; bg: string } {
  if (status === 'present') return { text: TOKENS.success, bg: TOKENS.successBg }
  if (status === 'late') return { text: TOKENS.warning, bg: TOKENS.warningBg }
  return { text: TOKENS.danger, bg: TOKENS.dangerBg }
}

export function renderReportHtml(data: ReportData): string {
  const tierStyle = data.tier ? TIER_COLOR[data.tier] : { text: TOKENS.neutral500, bg: TOKENS.neutral100 }

  const marksSection = data.marksByExam.length === 0
    ? `<p style="color:${TOKENS.neutral500};font-size:13px;padding:24px 0;text-align:center;">No marks recorded for ${esc(data.term)} yet.</p>`
    : data.marksByExam.map((group) => `
      <div style="margin-bottom:20px;">
        <h3 style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;font-weight:600;color:${TOKENS.neutral700};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">${esc(group.label)} Exam</h3>
        <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Sans',sans-serif;font-size:13px;">
          <thead>
            <tr style="background:${TOKENS.neutral50};text-align:left;">
              <th style="padding:8px 12px;font-size:10.5px;font-weight:600;color:${TOKENS.neutral500};text-transform:uppercase;border-bottom:1px solid ${TOKENS.neutral200};">Subject</th>
              <th style="padding:8px 12px;font-size:10.5px;font-weight:600;color:${TOKENS.neutral500};text-transform:uppercase;border-bottom:1px solid ${TOKENS.neutral200};">Score</th>
              <th style="padding:8px 12px;font-size:10.5px;font-weight:600;color:${TOKENS.neutral500};text-transform:uppercase;border-bottom:1px solid ${TOKENS.neutral200};">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${group.rows.map((m) => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid ${TOKENS.neutral100};color:${TOKENS.neutral900};">${esc(m.subject)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid ${TOKENS.neutral100};font-family:'IBM Plex Mono',monospace;color:${scoreColor(m.score, m.maxScore)};font-weight:600;">${m.score}/${m.maxScore}</td>
                <td style="padding:8px 12px;border-bottom:1px solid ${TOKENS.neutral100};font-family:'IBM Plex Mono',monospace;font-weight:700;color:${TOKENS.ink700};">${esc(m.grade)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')

  const attendanceSection = data.attendanceLog.length === 0
    ? `<p style="color:${TOKENS.neutral500};font-size:13px;padding:24px 0;text-align:center;">No attendance recorded yet.</p>`
    : data.attendanceLog.map((month) => `
      <div style="margin-bottom:18px;page-break-inside:avoid;">
        <h3 style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;font-weight:600;color:${TOKENS.neutral700};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">${esc(month.label)}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${month.rows.map((r) => {
            const c = attendanceStatusColor(r.status)
            return `
              <span style="display:inline-flex;align-items:center;gap:5px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:600;color:${c.text};background:${c.bg};padding:4px 8px;border-radius:8px;">
                ${formatLogDate(r.date)} &middot; ${esc(ATTENDANCE_LABEL[r.status] ?? r.status)}
              </span>
            `
          }).join('')}
        </div>
      </div>
    `).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,600;1,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans', sans-serif; color: ${TOKENS.neutral900}; padding: 48px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .card { box-shadow: 0 1px 2px rgba(38,34,29,0.04), 0 8px 20px -6px rgba(38,34,29,0.08); }
</style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${TOKENS.ink700};padding-bottom:20px;margin-bottom:32px;">
    <div>
      <h1 style="font-family:'Newsreader',serif;font-style:italic;font-weight:600;font-size:27px;color:${TOKENS.ink700};letter-spacing:-0.01em;">JE Academy</h1>
      <p style="font-size:12px;color:${TOKENS.neutral500};margin-top:3px;letter-spacing:0.01em;">Student Progress Report</p>
    </div>
    <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:${TOKENS.neutral500};">Generated ${formatDate(data.generatedAt)}</p>
  </div>

  <div class="card" style="display:flex;justify-content:space-between;align-items:flex-start;background:${TOKENS.ink50};border-radius:16px;padding:22px 26px;margin-bottom:24px;">
    <div>
      <h2 style="font-size:19px;font-weight:600;color:${TOKENS.neutral900};letter-spacing:-0.01em;">${esc(data.student.fullName)}</h2>
      <p style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:${TOKENS.neutral700};margin-top:5px;">
        ${esc(data.student.rollNumber)} &nbsp;·&nbsp; ${esc(data.student.program)} &nbsp;·&nbsp; Grade ${esc(data.student.gradeLevel)}-${esc(data.student.section)} &nbsp;·&nbsp; Term ${esc(data.term)}
      </p>
    </div>
    <div style="text-align:right;">
      <span style="display:inline-block;font-size:11px;font-weight:600;color:${tierStyle.text};background:${tierStyle.bg};padding:5px 13px;border-radius:999px;">
        ${data.tier ? esc(data.tier) : 'Not yet evaluated'}
      </span>
    </div>
  </div>

  <div style="display:flex;gap:16px;margin-bottom:32px;">
    <div class="card" style="flex:1;border:1px solid ${TOKENS.neutral200};border-radius:16px;padding:18px 22px;">
      <p style="font-size:10.5px;font-weight:600;color:${TOKENS.neutral500};text-transform:uppercase;letter-spacing:0.06em;">Attendance</p>
      <p style="font-family:'IBM Plex Mono',monospace;font-size:29px;font-weight:600;color:${TOKENS.ink700};margin-top:5px;">${data.attendancePct !== null ? `${data.attendancePct}%` : '—'}</p>
      <p style="font-size:11px;color:${TOKENS.neutral500};margin-top:3px;">${data.presentDays} present of ${data.totalDays} marked day${data.totalDays === 1 ? '' : 's'}</p>
    </div>
    <div class="card" style="flex:1;border:1px solid ${TOKENS.neutral200};border-radius:16px;padding:18px 22px;">
      <p style="font-size:10.5px;font-weight:600;color:${TOKENS.neutral500};text-transform:uppercase;letter-spacing:0.06em;">Overall Average</p>
      <p style="font-family:'IBM Plex Mono',monospace;font-size:29px;font-weight:600;color:${TOKENS.ink700};margin-top:5px;">${data.overallAverage !== null ? `${data.overallAverage}%` : '—'}</p>
      <p style="font-size:11px;color:${TOKENS.neutral500};margin-top:3px;">Across all exams recorded this term</p>
    </div>
  </div>

  <h2 style="font-size:14px;font-weight:600;color:${TOKENS.neutral900};margin-bottom:14px;">Exam Results</h2>
  ${marksSection}

  <h2 style="font-size:14px;font-weight:600;color:${TOKENS.neutral900};margin:28px 0 14px;">Attendance Record</h2>
  ${attendanceSection}

  <p style="margin-top:36px;padding-top:18px;border-top:1px solid ${TOKENS.neutral200};font-size:10.5px;color:${TOKENS.neutral500};">
    JE Academy · Karachi, Pakistan · This report is generated on demand and reflects data at the time of generation.
  </p>
</body>
</html>`
}
