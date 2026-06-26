import {
  LayoutDashboard, Users, UserPlus, Inbox,
  CalendarCheck, BookOpen, Megaphone, Settings2, UserCog,
  ClipboardList, BarChart2, PenLine, PlayCircle, Heart,
  GraduationCap, UsersRound, School,
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

  teacher: [
    {
      items: [{ label: 'Dashboard', href: '/teacher', icon: LayoutDashboard }],
    },
    {
      title: 'My Classes',
      items: [
        { label: 'Timetable',   href: '/teacher/timetable',  icon: School        },
        { label: 'My Students', href: '/teacher/students',   icon: Users         },
        { label: 'Attendance',  href: '/teacher/attendance', icon: CalendarCheck },
        { label: 'Marks',       href: '/teacher/marks',      icon: BookOpen      },
      ],
    },
    {
      title: 'School',
      items: [{ label: 'Notices', href: '/teacher/notices', icon: Megaphone }],
    },
  ],

  student: [
    {
      items: [{ label: 'Dashboard', href: '/student', icon: LayoutDashboard }],
    },
    {
      title: 'My Learning',
      items: [
        { label: 'Video Lectures', href: '/student/lectures',   icon: PlayCircle    },
        { label: 'My Attendance',  href: '/student/attendance', icon: CalendarCheck },
        { label: 'My Marks',       href: '/student/marks',      icon: BookOpen      },
      ],
    },
    {
      title: 'School',
      items: [{ label: 'Notices', href: '/student/notices', icon: Megaphone }],
    },
  ],

  parent: [
    {
      items: [{ label: 'Dashboard', href: '/parent', icon: LayoutDashboard }],
    },
    {
      title: 'My Children',
      items: [
        { label: 'Overview',   href: '/parent/children',   icon: Heart         },
        { label: 'Attendance', href: '/parent/attendance', icon: CalendarCheck },
        { label: 'Marks',      href: '/parent/marks',      icon: BookOpen      },
      ],
    },
    {
      title: 'School',
      items: [{ label: 'Notices', href: '/parent/notices', icon: Megaphone }],
    },
  ],
}
