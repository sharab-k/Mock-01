import SuperAdminFeeHeadsContent from '@/components/dashboard/modules/SuperAdminFeeHeadsContent'
import { fetchFeeHeads } from '@/lib/fees/ledger'

export default async function SuperAdminFeeHeadsPage() {
  return <SuperAdminFeeHeadsContent heads={await fetchFeeHeads()} />
}
