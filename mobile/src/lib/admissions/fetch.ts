import { supabase } from '@/lib/supabase/client';
import { STATUS_FROM_DB } from './enquiry-mapping';
import type { Enquiry } from './enquiry-types';

export async function fetchEnquiries(): Promise<Enquiry[]> {
  const { data } = await supabase
    .from('admission_enquiries')
    .select('*')
    .order('created_at', { ascending: false });

  return (data ?? []).map((e) => ({
    id: e.id,
    parent_name: e.parent_name,
    parent_phone: e.parent_phone,
    grade_interest: e.grade_interest,
    program_interest: e.program_interest,
    message: e.message ?? '',
    status: STATUS_FROM_DB[e.status],
    received_at: new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }));
}

export type AdmissionsDashboardData = {
  totalEnrolled: number;
  pendingEnquiries: number;
  newRegistrations: number;
  recentEnquiries: Enquiry[];
};

// A trimmed version of the web's AdmissionsDashboard: parentIdsIssued
// (countParentAccounts) needs the service-role client for a KPI that isn't
// essential at a glance, so it's dropped here rather than adding another
// mediated route for it — everything else is identical, RLS-scoped reads.
export async function fetchAdmissionsDashboardData(): Promise<AdmissionsDashboardData> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [studentsRes, enquiriesRes, pendingRes, newRegRes] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
    supabase.from('admission_enquiries').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('admission_enquiries').select('id', { count: 'exact', head: true }).in('status', ['unread', 'awaiting_visit']),
    supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', sevenDaysAgo),
  ]);

  const recentEnquiries: Enquiry[] = (enquiriesRes.data ?? []).map((e) => ({
    id: e.id,
    parent_name: e.parent_name,
    parent_phone: e.parent_phone,
    grade_interest: e.grade_interest,
    program_interest: e.program_interest,
    message: e.message ?? '',
    status: STATUS_FROM_DB[e.status],
    received_at: new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }));

  return {
    totalEnrolled: studentsRes.count ?? 0,
    pendingEnquiries: pendingRes.count ?? 0,
    newRegistrations: newRegRes.count ?? 0,
    recentEnquiries,
  };
}

export type DirectoryStudent = {
  id: string;
  full_name: string;
  roll_number: string;
  grade: string;
  section: string;
  status: 'Active' | 'Inactive';
};

// Parent name is dropped from this list (needs the service-role client on
// the web — lib/admissions/parent-lookup.ts) since it's not essential glance
// info for a phone directory; roll/name/grade/section/status is enough.
export async function fetchStudentDirectory(): Promise<DirectoryStudent[]> {
  const { data: rows } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section, status')
    .is('deleted_at', null)
    .order('gr_number', { ascending: true });

  return (rows ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    roll_number: s.roll_number,
    grade: s.grade_level,
    section: s.section,
    status: s.status === 'active' ? 'Active' : 'Inactive',
  }));
}
