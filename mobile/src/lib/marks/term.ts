// Ported from the web's lib/marks/term.ts — no term/semester model exists
// yet, every entry this school year shares one free-text identifier.
export function currentTerm(): string {
  return String(new Date().getFullYear());
}
