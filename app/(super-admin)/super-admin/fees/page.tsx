import SuperAdminFeesContent from '@/components/dashboard/modules/SuperAdminFeesContent'
import { fetchMonthLedger, fetchOverview } from '@/lib/fees/ledger'

type Props = {
  searchParams: Promise<{ year?: string; month?: string }>
}

const pad = (n: number) => String(n).padStart(2, '0')

export default async function SuperAdminFeesPage({ searchParams }: Props) {
  const { year: yearParam, month: monthParam } = await searchParams
  const now = new Date()
  const y = Number(yearParam)
  const m = Number(monthParam)
  const year = Number.isInteger(y) && y >= 2020 && y <= 2100 ? y : now.getFullYear()
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1

  const lastDay = new Date(year, month, 0).getDate()
  const [{ rows }, overview] = await Promise.all([
    fetchMonthLedger(year, month),
    fetchOverview(`${year}-${pad(month)}-01`, `${year}-${pad(month)}-${pad(lastDay)}`),
  ])

  return <SuperAdminFeesContent year={year} month={month} rows={rows} collected={overview.collected} receiptCount={overview.receiptCount} outstanding={overview.outstanding} />
}
