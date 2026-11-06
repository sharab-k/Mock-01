import SuperAdminFeePaymentsContent from '@/components/dashboard/modules/SuperAdminFeePaymentsContent'
import { FEE_METHODS, type FeeMethod } from '@/lib/fees/constants'
import { fetchOverview, fetchPayments } from '@/lib/fees/ledger'

type Props = { searchParams: Promise<{ from?: string; to?: string; method?: string; q?: string }> }

const ISO = /^\d{4}-\d{2}-\d{2}$/

export default async function SuperAdminFeePaymentsPage({ searchParams }: Props) {
  const sp = await searchParams
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`
  const from = sp.from && ISO.test(sp.from) ? sp.from : monthStart
  const to = sp.to && ISO.test(sp.to) ? sp.to : today
  const method = (FEE_METHODS as readonly string[]).includes(sp.method ?? '') ? (sp.method as FeeMethod) : ''
  const q = (sp.q ?? '').slice(0, 100)

  const [payments, overview] = await Promise.all([
    fetchPayments({ from, to, method: method || null, q }),
    fetchOverview(from, to),
  ])

  return <SuperAdminFeePaymentsContent from={from} to={to} method={method} q={q} payments={payments} collected={overview.collected} receiptCount={overview.receiptCount} />
}
