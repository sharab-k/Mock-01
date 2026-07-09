// Canonical sub-administrator roster — Super Admin's Staff Accounts page and
// dashboard summary card both read from this single source.
// TODO: replace with a Supabase query against `profiles` filtered by role.

export type StaffRole = 'Admissions Admin' | 'Attendance Admin' | 'Marks Admin'
export type StaffStatus = 'Active' | 'Inactive'

export type StaffMember = {
  id: string
  name: string
  role: StaffRole
  email: string
  phone: string
  lastLogin: string
  status: StaffStatus
}

export const ROLE_DOT: Record<StaffRole, string> = {
  'Admissions Admin': 'bg-[#A26D53]',
  'Attendance Admin': 'bg-[#487A63]',
  'Marks Admin': 'bg-[#7E587E]',
}

export const STAFF: StaffMember[] = [
  { id: 'stf-1', name: 'Ms. Asma Tahir',     role: 'Admissions Admin', email: 'a.tahir@jeacademy.edu.pk',    phone: '0321 4567890', lastLogin: '24 Jun 2026, 08:14', status: 'Active' },
  { id: 'stf-2', name: 'Mr. Junaid Karim',    role: 'Attendance Admin', email: 'j.karim@jeacademy.edu.pk',    phone: '0300 1234567', lastLogin: '24 Jun 2026, 08:01', status: 'Active' },
  { id: 'stf-3', name: 'Ms. Rida Farooq',     role: 'Marks Admin',      email: 'r.farooq@jeacademy.edu.pk',   phone: '0333 7654321', lastLogin: '23 Jun 2026, 14:32', status: 'Active' },
  { id: 'stf-4', name: 'Mr. Bilal Chaudhry',  role: 'Attendance Admin', email: 'b.chaudhry@jeacademy.edu.pk', phone: '0345 9988776', lastLogin: '22 Jun 2026, 09:10', status: 'Inactive' },
  { id: 'stf-5', name: 'Ms. Huma Zaidi',      role: 'Admissions Admin', email: 'h.zaidi@jeacademy.edu.pk',    phone: '0312 5544332', lastLogin: '24 Jun 2026, 07:55', status: 'Active' },
  { id: 'stf-6', name: 'Mr. Kashif Nadeem',   role: 'Marks Admin',      email: 'k.nadeem@jeacademy.edu.pk',   phone: '0301 2233445', lastLogin: '21 Jun 2026, 11:20', status: 'Active' },
  { id: 'stf-7', name: 'Ms. Sadia Anwar',     role: 'Attendance Admin', email: 's.anwar@jeacademy.edu.pk',    phone: '0334 6677889', lastLogin: '24 Jun 2026, 08:20', status: 'Active' },
  { id: 'stf-8', name: 'Mr. Fahad Rasheed',   role: 'Admissions Admin', email: 'f.rasheed@jeacademy.edu.pk',  phone: '0322 1122334', lastLogin: '19 Jun 2026, 16:05', status: 'Inactive' },
]

export const INITIALS = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
