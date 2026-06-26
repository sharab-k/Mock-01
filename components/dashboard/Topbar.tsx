'use client'

import { useState } from 'react'
import { Menu, Bell, ChevronDown, LogOut, User } from 'lucide-react'
import type { UserInfo } from './types'

type Props = {
  user: UserInfo
  pageTitle?: string
  breadcrumb?: { label: string; href?: string }[]
  onMenuClick: () => void
}

export default function Topbar({ user, pageTitle = 'Dashboard', breadcrumb, onMenuClick }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

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
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-white" />
        </button>

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
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors">
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
    </header>
  )
}
