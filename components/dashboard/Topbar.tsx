'use client'

import { useState } from 'react'
import { Menu, Bell, ChevronDown, LogOut, User, X, MessageSquare, UserPlus, BookOpen } from 'lucide-react'
import type { UserInfo } from './types'

type Props = {
  user: UserInfo
  pageTitle?: string
  breadcrumb?: { label: string; href?: string }[]
  onMenuClick: () => void
}

type Notification = { id: string; icon: typeof MessageSquare; iconBg: string; iconColor: string; text: string; time: string }

const NOTIFICATIONS: Notification[] = [
  { id: 'n1', icon: MessageSquare, iconBg: 'bg-success-bg', iconColor: 'text-success', text: 'WhatsApp alert sent — absence recorded for Usman Sheikh', time: '12 min ago' },
  { id: 'n2', icon: UserPlus,      iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', text: 'New admission enquiry from Rashid Iqbal',                time: '1 hour ago' },
  { id: 'n3', icon: BookOpen,      iconBg: 'bg-warning-bg', iconColor: 'text-warning', text: 'Marks entry completed for Grade 11 Physics — Half-Yearly', time: '3 hours ago' },
]

export default function Topbar({ user, pageTitle = 'Dashboard', breadcrumb, onMenuClick }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 h-16 flex items-center px-5 sm:px-8 gap-4 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-neutral-500 hover:text-neutral-900 transition-colors p-1"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Title / breadcrumb */}
      <div className="flex-1 min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-neutral-400">
            <span>Dashboard</span>
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span>/</span>
                {crumb.href
                  ? <a href={crumb.href} className="text-neutral-500 hover:text-neutral-800 transition-colors no-underline">{crumb.label}</a>
                  : <span className="text-neutral-700 font-medium">{crumb.label}</span>
                }
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="text-[15px] font-semibold text-neutral-900 truncate">{pageTitle}</h1>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-white" />
          </button>

          {bellOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[85vw] bg-white rounded-2xl border border-neutral-200 shadow-3 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <span className="block text-[13px] font-semibold text-neutral-900">Notifications</span>
                </div>
                <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
                  {NOTIFICATIONS.map((n) => {
                    const Icon = n.icon
                    return (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.iconBg}`}>
                          <Icon size={14} className={n.iconColor} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-neutral-700 leading-snug">{n.text}</p>
                          <span className="text-[10.5px] text-neutral-400 mt-1 block">{n.time}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-neutral-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-ink-100 flex items-center justify-center text-[10px] font-bold text-ink-700 shrink-0">
              {user.initials}
            </div>
            <span className="hidden sm:block text-[13px] font-medium text-neutral-800 leading-none">
              {user.name.split(' ')[0]}
            </span>
            <ChevronDown size={13} className="text-neutral-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-neutral-200 shadow-3 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <span className="block text-[12px] font-semibold text-neutral-900">{user.name}</span>
                  <span className="block text-[11px] text-neutral-500 mt-0.5">{user.email}</span>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { setMenuOpen(false); setProfileOpen(true) }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors"
                  >
                    <User size={14} className="text-neutral-400" />
                    Profile
                  </button>
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-danger hover:bg-danger-bg rounded-xl transition-colors"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setProfileOpen(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Profile</h3>
              <button onClick={() => setProfileOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center text-[16px] font-bold text-ink-700 shrink-0">
                  {user.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-neutral-900 truncate">{user.name}</p>
                  <span className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-neutral-500">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: user.roleColor }} />
                    {user.roleLabel}
                  </span>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-400">Email</span>
                  <span className="font-mono text-neutral-800">{user.email}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-400">Role</span>
                  <span className="font-medium text-neutral-800">{user.roleLabel}</span>
                </div>
              </div>
              <p className="text-[11.5px] text-neutral-400 mt-5 leading-relaxed">
                Profile editing isn&apos;t available yet — contact your Super Admin for account changes.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
