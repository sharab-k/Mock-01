import AdmissionsDashboardContent from '@/components/dashboard/modules/AdmissionsDashboardContent'
import { createClient } from '@/lib/supabase/server'
import { GRADES, sectionsForGrade } from '@/lib/students/constants'
import { STATUS_FROM_DB } from '@/lib/admissions/enquiry-mapping'
import { countParentAccounts } from '@/lib/admissions/parent-lookup'

export default async function AdmissionsDashboard() {
  const supabase = await createClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [studentsRes, enquiriesRes, parentCount, pendingRes, newRegRes] = await Promise.all([
    supabase.from('students').select('grade_level, section').is('deleted_at', null).eq('status', 'active'),
    supabase.from('admission_enquiries').select('*').order('created_at', { ascending: false }).limit(5),
    countParentAccounts(),
    supabase.from('admission_enquiries').select('id', { count: 'exact', head: true }).in('status', ['unread', 'awaiting_visit']),
    supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', sevenDaysAgo),
  ])

  const classGrid: Record<string, Record<string, number>> = {}
  for (const g of GRADES) {
    classGrid[g] = {}
    for (const s of sectionsForGrade(g)) classGrid[g][s] = 0
  }
  for (const row of studentsRes.data ?? []) {
    if (classGrid[row.grade_level] && row.section in classGrid[row.grade_level]) {
      classGrid[row.grade_level][row.section]++
    }
  }
  const totalEnrolled = Object.values(classGrid).flatMap((g) => Object.values(g)).reduce((a, b) => a + b, 0)

  const enquiries = (enquiriesRes.data ?? []).map((e) => ({
    parent: e.parent_name,
    phone: e.parent_phone,
    grade: e.grade_interest,
    msg: e.message ?? '',
    date: new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    status: STATUS_FROM_DB[e.status],
  }))

  return (
    <AdmissionsDashboardContent
      basePath="/admissions"
      classGrid={classGrid}
      totalEnrolled={totalEnrolled}
      newRegistrations={newRegRes.count ?? 0}
      pendingEnquiries={pendingRes.count ?? 0}
      parentIdsIssued={parentCount}
      enquiries={enquiries}
    />
  )
}
