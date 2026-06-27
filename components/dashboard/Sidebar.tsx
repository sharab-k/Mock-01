'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { X, LogOut } from 'lucide-react'
import type { NavSection, UserInfo } from './types'

type Props = {
  nav: NavSection[]
  user: UserInfo
  open: boolean
  onClose: () => void
}

export default function Sidebar({ nav, user, open, onClose }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className={[
        'fixed top-0 left-0 h-full w-64 z-30 flex flex-col',
        'bg-ink-900',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="bg-white rounded-xl p-1 shrink-0">
            <Image
              src="/logos/je-academy-logo.png"
              width={30}
              height={30}
              alt="JE Academy"
              style={{ mixBlendMode: 'multiply' }}
            />
          </div>
          <span className="font-semibold text-[15px] text-white">JE Academy</span>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden text-ink-300 hover:text-white transition-colors p-1 rounded-lg"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {nav.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-ink-400 uppercase tracking-widest">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium no-underline transition-colors',
                      active
                        ? 'bg-white/12 text-white'
                        : 'text-ink-300 hover:bg-white/6 hover:text-white',
                    ].join(' ')}
                  >
                    <Icon size={16} className={active ? 'text-white' : 'text-ink-400'} strokeWidth={2} />
                    <span className="flex-1 leading-none">{item.label}</span>
                    {(item.badge ?? 0) > 0 && (
                      <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: user.roleColor }} />
          <span className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">{user.roleLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[12px] font-semibold text-white truncate">{user.name}</span>
            <span className="block text-[11px] text-ink-400 truncate">{user.email}</span>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              aria-label="Sign out"
              className="text-ink-400 hover:text-white transition-colors p-1 rounded-lg"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
