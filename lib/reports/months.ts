// Month choices for report downloads and exam entry: the current month and the
// ones before it, newest first. Pure (no browser/server imports) so the web and
// the phone app share the same logic.
export type MonthOption = { key: string; label: string }

const NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthOptionLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${NAMES[m - 1]} ${y}`
}

export function recentMonths(count = 18, now: Date = new Date()): MonthOption[] {
  let y = now.getFullYear()
  let m = now.getMonth() + 1
  const out: MonthOption[] = []
  for (let i = 0; i < count; i++) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    out.push({ key, label: monthOptionLabel(key) })
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return out
}

export const currentMonthKey = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

// The date to use when the person switches the exam to another month: same day
// of the month where it exists (31st -> that month's last day), never later
// than today.
export function dateInMonth(monthKey: string, currentIso: string, todayIso: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const day = Math.min(Number(currentIso.slice(8, 10)) || 1, lastDay)
  const iso = `${monthKey}-${String(day).padStart(2, '0')}`
  return iso > todayIso ? todayIso : iso
}
