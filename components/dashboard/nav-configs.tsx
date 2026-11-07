import {
  LayoutDashboard, Users, UserPlus, Inbox,
  CalendarCheck, BookOpen, Megaphone, Settings2, UserCog,
  ClipboardList, BarChart2, PenLine, PlayCircle,
  GraduationCap, UsersRound, Wallet, CalendarClock, Bell, Search, Upload, IdCard, Receipt, Layers, CalendarRange, Ticket, HandCoins, Landmark, MessageSquareWarning, ScrollText, Users2,
} from 'lucide-react'
import type { NavSection } from './types'

export const NAV_CONFIGS: Record<string, NavSection[]> = {
  super_admin: [
    {
      items: [{ label: 'Dashboard', href: '/super-admin', icon: LayoutDashboard }],
    },
    {
      title: 'People',
      items: [
        { label: 'Students', href: '/super-admin/students', icon: Users          },
        { label: 'Student Search', href: '/super-admin/search', icon: Search     },
        { label: 'Student Cards', href: '/super-admin/cards', icon: IdCard },
        { label: 'Teachers', href: '/super-admin/teachers', icon: GraduationCap  },
        { label: 'Parents',  href: '/super-admin/parents',  icon: UsersRound     },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Admissions', href: '/super-admin/admissions', icon: Inbox,        badge: 14 },
        { label: 'Attendance', href: '/super-admin/attendance', icon: CalendarCheck           },
        { label: 'First Year Attendance', href: '/super-admin/attendance/first-year', icon: BookOpen },
        { label: 'Second Year Attendance', href: '/super-admin/attendance/second-year', icon: BookOpen },
        { label: 'Marks',      href: '/super-admin/marks',      icon: BookOpen                },
        { label: 'Upload Marks', href: '/super-admin/marks/upload', icon: Upload              },
        { label: 'Upload Attendance', href: '/super-admin/attendance/upload', icon: Upload      },
        { label: 'Monthly Attendance Report', href: '/super-admin/attendance/reports/monthly', icon: CalendarRange },
        { label: 'Subjects',   href: '/super-admin/subjects',   icon: ClipboardList           },
        { label: 'Timetable',  href: '/super-admin/timetable',  icon: CalendarClock            },
        { label: 'Sent Alerts', href: '/super-admin/notifications', icon: Bell                },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Fees',       href: '/super-admin/fees',          icon: Wallet  },
        { label: 'Payments',   href: '/super-admin/fees/payments', icon: Receipt },
        { label: 'Vouchers',   href: '/super-admin/vouchers',      icon: Ticket  },
        { label: 'Fee Heads',  href: '/super-admin/fees/heads',    icon: Layers  },
        { label: 'Expenses',   href: '/super-admin/expenses',      icon: HandCoins },
        { label: 'Income & Expense', href: '/super-admin/finance', icon: Landmark },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Notices',      href: '/super-admin/notices',  icon: Megaphone },
        { label: 'Complaints',   href: '/super-admin/complaints', icon: MessageSquareWarning },
        { label: 'Rules & Regulations', href: '/super-admin/rules', icon: ScrollText },
        { label: 'Parent Meetings', href: '/super-admin/meetings', icon: Users2 },
        { label: 'Staff Accounts',href: '/super-admin/staff',   icon: UserCog   },
        { label: 'Settings',     href: '/super-admin/settings', icon: Settings2 },
      ],
    },
  ],

  admissions_admin: [
    {
      items: [{ label: 'Dashboard', href: '/admissions', icon: LayoutDashboard }],
    },
    {
      title: 'Admissions',
      items: [
        { label: 'Enquiries',    href: '/admissions/enquiries',    icon: Inbox,    badge: 14 },
        { label: 'Add Student',  href: '/admissions/students/new', icon: UserPlus            },
        { label: 'All Students', href: '/admissions/students',     icon: Users               },
      ],
    },
    {
      title: 'Communication',
      items: [
        { label: 'Notices', href: '/admissions/notices', icon: Megaphone },
        { label: 'Complaints', href: '/admissions/complaints', icon: MessageSquareWarning },
        { label: 'Rules & Regulations', href: '/admissions/rules', icon: ScrollText },
        { label: 'Parent Meetings', href: '/admissions/meetings', icon: Users2 },
      ],
    },
  ],

  attendance_admin: [
    {
      items: [{ label: 'Dashboard', href: '/attendance', icon: LayoutDashboard }],
    },
    {
      title: 'Attendance',
      items: [
        { label: 'Mark Today', href: '/attendance/mark',    icon: CalendarCheck },
        { label: 'First Year (by subject)', href: '/attendance/first-year', icon: BookOpen },
        { label: 'Second Year (by subject)', href: '/attendance/second-year', icon: BookOpen },
        { label: 'Roster',     href: '/attendance/roster',  icon: ClipboardList },
        { label: 'Upload Attendance', href: '/attendance/upload', icon: Upload },
        { label: 'Reports',    href: '/attendance/reports', icon: BarChart2     },
        { label: 'Monthly Report', href: '/attendance/reports/monthly', icon: CalendarRange },
      ],
    },
    {
      title: 'Students',
      items: [{ label: 'Students List', href: '/attendance/students', icon: Users }],
    },
  ],

  marks_admin: [
    {
      items: [{ label: 'Dashboard', href: '/marks', icon: LayoutDashboard }],
    },
    {
      title: 'Marks',
      items: [
        { label: 'Enter Marks', href: '/marks/enter',    icon: PenLine   },
        { label: 'Upload Marks', href: '/marks/upload',  icon: Upload    },
        { label: 'Tests',       href: '/marks/tests',    icon: ClipboardList },
        { label: 'Subjects',    href: '/marks/subjects', icon: BookOpen  },
        { label: 'Reports',     href: '/marks/reports',  icon: BarChart2 },
      ],
    },
    {
      title: 'Students',
      items: [{ label: 'Students List', href: '/marks/students', icon: Users }],
    },
  ],

  parent: [
    {
      items: [
        { label: 'Dashboard',     href: '/parent',               icon: LayoutDashboard },
        { label: 'Fees',          href: '/parent/fees',          icon: Wallet          },
        { label: 'Complaints',    href: '/parent/complaints',    icon: MessageSquareWarning },
        { label: 'Rules',         href: '/parent/rules',         icon: ScrollText      },
        { label: 'Meetings',      href: '/parent/meetings',      icon: Users2          },
        { label: 'Notifications', href: '/parent/notifications', icon: Bell            },
      ],
    },
  ],
}

// No role ever equals 'student' (CLAUDE.md §4 — one credential per family,
// issued to the parent) — the (student) route group is reached through a
// parent's session for one specific linked child, so its nav can't be a
// static NAV_CONFIGS entry the way every other role's is. studentId gets
// baked into each href here instead; see DashboardShell's `navSections` prop.
export function buildStudentNavSections(studentId: string): NavSection[] {
  const base = `/student/${studentId}`
  return [
    {
      items: [{ label: 'Dashboard', href: base, icon: LayoutDashboard }],
    },
    {
      title: 'My Learning',
      items: [
        { label: 'Video Lectures', href: `${base}/lectures`,   icon: PlayCircle    },
        { label: 'My Attendance',  href: `${base}/attendance`, icon: CalendarCheck },
        { label: 'My Marks',       href: `${base}/marks`,      icon: BookOpen      },
      ],
    },
    {
      title: 'School',
      items: [
        { label: 'Notifications', href: '/parent/notifications', icon: Bell      },
        { label: 'Notices',       href: `${base}/notices`,       icon: Megaphone },
      ],
    },
  ]
}
