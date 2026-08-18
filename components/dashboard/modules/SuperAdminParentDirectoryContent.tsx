'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import type { ParentDirectoryRow } from '@/lib/admissions/parent-lookup'
import { setParentPasswordAction } from '@/lib/actions/parents'
import SetPasswordModal from '@/components/dashboard/SetPasswordModal'

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function SuperAdminParentDirectoryContent({ parents }: { parents: ParentDirectoryRow[] }) {
  const [query, setQuery] = useState('')
  const [passwordTarget, setPasswordTarget] = useState<ParentDirectoryRow | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parents
    return parents.filter((p) =>
      p.name.toLowerCase().includes(q) || p.children.some((c) => c.name.toLowerCase().includes(q))
    )
  }, [parents, query])

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Parent Directory</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{parents.length} parent accounts · derived from linked students</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by parent or child name…"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[520px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Parent / Guardian</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Linked Children</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p) => (
                <tr key={p.key} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(p.name)}</div>
                      <span className="font-medium text-neutral-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[12px] text-neutral-500 hidden sm:table-cell">{p.phone}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {p.children.map((c) => (
                        <span key={c.roll} className="text-[10.5px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                          {c.name} <span className="font-mono text-neutral-400">· {c.grade}{c.section}</span>
                        </span>
                      ))}
                      {p.children.length > 1 && (
                        <span className="text-[10.5px] font-semibold text-ink-600 bg-ink-50 px-2 py-0.5 rounded-full">
                          {p.children.length} siblings
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <button onClick={() => setPasswordTarget(p)} className="text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors">
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-[13px] text-neutral-400">No parents match this search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {passwordTarget && (
        <SetPasswordModal
          targetName={passwordTarget.name}
          onClose={() => setPasswordTarget(null)}
          onSubmit={(newPassword) => setParentPasswordAction({ id: passwordTarget.key, newPassword })}
        />
      )}
    </>
  )
}
