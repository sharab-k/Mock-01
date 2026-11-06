import { notFound } from 'next/navigation'
import SuperAdminStudentLedgerContent from '@/components/dashboard/modules/SuperAdminStudentLedgerContent'
import { fetchStudentLedger } from '@/lib/fees/ledger'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SuperAdminStudentLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const ledger = await fetchStudentLedger(id)
  if (!ledger) notFound()
  return <SuperAdminStudentLedgerContent student={ledger.student} heads={ledger.heads} charges={ledger.charges} receipts={ledger.receipts} />
}
