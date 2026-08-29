import { notFound } from 'next/navigation'
import TestEntryContent from '@/components/dashboard/modules/TestEntryContent'
import { fetchTestRoster } from '@/lib/actions/tests'

export default async function SuperAdminTestEntryPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params
  const result = await fetchTestRoster(testId)
  if (!result.ok) notFound()
  return <TestEntryContent basePath="/super-admin/marks" test={result.test} initialRoster={result.roster} />
}
