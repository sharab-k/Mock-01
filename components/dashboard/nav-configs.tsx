import {
  LayoutDashboard, Users, UserPlus, Inbox,
  CalendarCheck, BookOpen, Megaphone, Settings2, UserCog,
  ClipboardList, BarChart2, PenLine, PlayCircle,
  GraduationCap, UsersRound,
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
        { label: 'Teachers', href: '/super-admin/teachers', icon: GraduationCap  },
        { label: 'Parents',  href: '/super-admin/parents',  icon: UsersRound     },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Admissions', href: '/super-admin/admissions', icon: Inbox,        badge: 14 },
        { label: 'Attendance', href: '/super-admin/attendance', icon: CalendarCheck           },
        { label: 'Marks',      href: '/super-admin/marks',      icon: BookOpen                },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Notices',      href: '/super-admin/notices',  icon: Megaphone },
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
      items: [{ label: 'Notices', href: '/admissions/notices', icon: Megaphone }],
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
        { label: 'Roster',     href: '/attendance/roster',  icon: ClipboardList },
        { label: 'Reports',    href: '/attendance/reports', icon: BarChart2     },
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
      items: [{ label: 'Dashboard', href: '/parent', icon: LayoutDashboard }],
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
      items: [{ label: 'Notices', href: `${base}/notices`, icon: Megaphone }],
    },
  ]
}
