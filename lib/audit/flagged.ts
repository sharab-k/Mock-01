// "Flagged" is a display concern, not data (CLAUDE.md §5 / the plan's schema
// note) — derived here at query/render time against a small fixed keyword
// list, not a stored column, so every consumer (audit page, dashboard root
// widget) agrees on what counts as flagged without duplicating the list.
const FLAG_KEYWORDS = ['Deleted', 'Deactivated', 'failover', 'Failed']

export function isFlaggedAction(action: string): boolean {
  return FLAG_KEYWORDS.some((kw) => action.includes(kw))
}
