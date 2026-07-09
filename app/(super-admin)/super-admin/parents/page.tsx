'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { STUDENTS, INITIALS } from '@/lib/mock/students'

type ParentRow = {
  key: string
  name: string
  phone: string
  children: { name: string; roll: string; grade: string; section: string }[]
}

function buildParentDirectory(): ParentRow[] {
  const map = new Map<string, ParentRow>()
  for (const s of STUDENTS) {
    const key = `${s.parent_name}__${s.parent_phone}`
    if (!map.has(key)) {
      map.set(key, { key, name: s.parent_name, phone: s.parent_phone, children: [] })
    }
    map.get(key)!.children.push({ name: s.full_name, roll: s.roll_number, grade: s.grade, section: s.section })
  }
  return Array.from(map.values())
}

const PARENTS = buildParentDirectory()

export default function SuperAdminParentsPage() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PARENTS
    return PARENTS.filter((p) =>
      p.name.toLowerCase().includes(q) || p.children.some((c) => c.name.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Parent Directory</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{PARENTS.length} parent accounts · derived from linked students</p>
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
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-10 text-center text-[13px] text-neutral-400">No parents match this search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
