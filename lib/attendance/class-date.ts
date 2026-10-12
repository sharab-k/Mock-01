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
