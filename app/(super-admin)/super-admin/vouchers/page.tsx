import SuperAdminVouchersContent from '@/components/dashboard/modules/SuperAdminVouchersContent'
import { fetchVoucherCandidates } from '@/lib/fees/vouchers'

type Props = { searchParams: Promise<{ year?: string; month?: string }> }

export default async function SuperAdminVouchersPage({ searchParams }: Props) {
  const sp = await searchParams
  const now = new Date()
  const y = Number(sp.year)
  const m = Number(sp.month)
  const year = Number.isInteger(y) && y >= 2020 && y <= 2100 ? y : now.getFullYear()
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1

  const candidates = await fetchVoucherCandidates(year, month)
  return <SuperAdminVouchersContent key={`${year}-${month}`} year={year} month={month} candidates={candidates} />
}
