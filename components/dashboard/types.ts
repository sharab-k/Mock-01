import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

export type NavSection = {
  title?: string
  items: NavItem[]
}

export type UserInfo = {
  name: string
  email: string
  role: string
  roleLabel: string
  roleColor: string
  initials: string
}
