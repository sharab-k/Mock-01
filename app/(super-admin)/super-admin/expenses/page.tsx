import SuperAdminExpensesContent from '@/components/dashboard/modules/SuperAdminExpensesContent'
import { ISO_DATE, firstOfMonth } from '@/lib/finance/constants'
import { fetchExpenseBreakdown, fetchExpenseHeads, fetchExpenses } from '@/lib/finance/ledger'

type Props = { searchParams: Promise<{ from?: string; to?: string; head?: string; q?: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SuperAdminExpensesPage({ searchParams }: Props) {
  const sp = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const from = sp.from && ISO_DATE.test(sp.from) ? sp.from : firstOfMonth(today)
  const to = sp.to && ISO_DATE.test(sp.to) ? sp.to : today
  const headId = sp.head && UUID.test(sp.head) ? sp.head : ''
  const q = (sp.q ?? '').slice(0, 100)

  const [heads, expenses, breakdown] = await Promise.all([
    fetchExpenseHeads(),
    fetchExpenses({ from, to, headId: headId || null, q }),
    fetchExpenseBreakdown(from, to, headId || null),
  ])
  const total = breakdown.byHead.reduce((n, r) => n + r.total, 0)
  const count = breakdown.byHead.reduce((n, r) => n + r.n, 0)

  return <SuperAdminExpensesContent from={from} to={to} headId={headId} q={q} heads={heads} expenses={expenses} total={total} count={count} />
}
