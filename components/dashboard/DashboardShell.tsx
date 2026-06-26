'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { NAV_CONFIGS } from './nav-configs'
import type { UserInfo } from './types'

type Props = {
  user: UserInfo
  pageTitle?: string
  breadcrumb?: { label: string; href?: string }[]
  children: React.ReactNode
}

export default function DashboardShell({ user, pageTitle, breadcrumb, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const nav = NAV_CONFIGS[user.role] ?? []

  return (
    <div className="min-h-screen bg-neutral-100 font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-neutral-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        nav={nav}
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          user={user}
          pageTitle={pageTitle}
          breadcrumb={breadcrumb}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-5 sm:p-8 space-y-6">
          {children}
        </main>
        <footer className="px-8 py-3.5 border-t border-neutral-200 bg-white">
          <span className="text-[11px] text-neutral-400">
            © {new Date().getFullYear()} JE Academy · Karachi, Pakistan
          </span>
        </footer>
      </div>
    </div>
  )
}
