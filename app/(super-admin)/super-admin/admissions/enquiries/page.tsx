import AdmissionsEnquiriesContent from '@/components/dashboard/modules/AdmissionsEnquiriesContent'
import { createClient } from '@/lib/supabase/server'
import { STATUS_FROM_DB } from '@/lib/admissions/enquiry-mapping'
import type { Enquiry } from '@/lib/admissions/enquiry-types'

export default async function SuperAdminEnquiriesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('admission_enquiries')
    .select('*')
    .order('created_at', { ascending: false })

  const enquiries: Enquiry[] = (data ?? []).map((e) => ({
    id: e.id,
    parent_name: e.parent_name,
    parent_phone: e.parent_phone,
    grade_interest: e.grade_interest,
    program_interest: e.program_interest,
    message: e.message ?? '',
    status: STATUS_FROM_DB[e.status],
    received_at: new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }))

  return <AdmissionsEnquiriesContent basePath="/super-admin/admissions" initialEnquiries={enquiries} />
}
