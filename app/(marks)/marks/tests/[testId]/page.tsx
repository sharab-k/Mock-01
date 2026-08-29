import { notFound } from 'next/navigation'
import TestEntryContent from '@/components/dashboard/modules/TestEntryContent'
import { fetchTestRoster } from '@/lib/actions/tests'

export default async function MarksTestEntryPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params
  const result = await fetchTestRoster(testId)
  if (!result.ok) notFound()
  return <TestEntryContent test={result.test} initialRoster={result.roster} />
}
