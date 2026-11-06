// The day an attendance roster is being viewed/marked for. Defaults to today;
// a past day may be requested (back-dated marking) but never a future one.
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function resolveClassDate(raw: string | null | undefined): string {
  const today = todayIso()
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today
  const d = new Date(`${raw}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return today
  return raw > today ? today : raw
}

/**
 * Jump to another month, keeping the day of the month where it exists (31 Oct -> 30 Nov) and never
 * going past today. `ym` is "YYYY-MM"; anything invalid leaves the date unchanged.
 */
export function moveToMonth(classDate: string, ym: string, today: string = todayIso()): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return classDate
  const [y, m] = ym.split('-').map(Number) as [number, number]
  if (m < 1 || m > 12) return classDate
  const day = Number(classDate.slice(8, 10)) || 1
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const moved = `${ym}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
  return moved > today ? today : moved
}
