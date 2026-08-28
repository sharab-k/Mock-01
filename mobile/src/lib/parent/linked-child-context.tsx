import { createContext, useContext, type ReactNode } from 'react';
import type { LinkedChild } from './use-linked-child';

const LinkedChildContext = createContext<LinkedChild | null>(null);

// The Tabs layout (student/[studentId]/_layout.tsx) already resolves and
// authorizes the child via useLinkedChild before it ever renders its child
// screens — every screen under it independently calling useLinkedChild
// again was not just a redundant network round trip, it was actively wrong:
// two separate calls to the same RLS-gated query can genuinely disagree
// (this is what produced "child: denied" on the Lectures screen even though
// the layout's own check had already passed and rendered the tab bar), and
// none of those per-screen call sites handled a 'denied' result at all — so
// a screen that hit it just sat on its loading spinner forever with no way
// out. Sharing the layout's single resolved child via context instead
// removes both problems: one query per navigation, and no second place that
// can independently fail.
export function LinkedChildProvider({ child, children }: { child: LinkedChild; children: ReactNode }) {
  return <LinkedChildContext.Provider value={child}>{children}</LinkedChildContext.Provider>;
}

export function useLinkedChildContext(): LinkedChild {
  const child = useContext(LinkedChildContext);
  if (!child) throw new Error('useLinkedChildContext must be used within a LinkedChildProvider');
  return child;
}
