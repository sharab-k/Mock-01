// No term/semester model exists yet (see the Phase 4 migration's note on
// `marks.term`) — every entry this school year shares one free-text
// identifier. Shared so the entry form, reports, and any future term-scoped
// query all agree on what "this term" means.
export function currentTerm(): string {
  return String(new Date().getFullYear())
}

// The term a dated exam belongs to — the school-year (calendar year) it was held
// in, so back-dated and uploaded results land in the right year's reports.
export function termForDate(isoDate: string): string {
  return isoDate.slice(0, 4)
}
