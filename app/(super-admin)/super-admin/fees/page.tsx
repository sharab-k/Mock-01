import SuperAdminFeesContent from '@/components/dashboard/modules/SuperAdminFeesContent'
import { fetchFeeRoster } from '@/lib/fees/roster'

type Props = {
  searchParams: Promise<{ year?: string; month?: string }>
}

export default async function SuperAdminFeesPage({ searchParams }: Props) {
  const { year: yearParam, month: monthParam } = await searchParams
  const now = new Date()
  const year = yearParam ? Number(yearParam) : now.getFullYear()
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1

  const students = await fetchFeeRoster(year, month)

  return <SuperAdminFeesContent year={year} month={month} students={students} />
}
