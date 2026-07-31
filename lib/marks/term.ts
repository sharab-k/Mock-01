// No term/semester model exists yet (see the Phase 4 migration's note on
// `marks.term`) — every entry this school year shares one free-text
// identifier. Shared so the entry form, reports, and any future term-scoped
// query all agree on what "this term" means.
export function currentTerm(): string {
  return String(new Date().getFullYear())
}
