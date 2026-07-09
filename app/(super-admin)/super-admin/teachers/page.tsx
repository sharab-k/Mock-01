'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'

// Informational directory only — teaching staff aren't an auth role in this
// system (no `teachers` table in the CLAUDE.md schema), so this is presentation
// data for Super Admin visibility, not wired to a shared mock/data source.
const TEACHERS = [
  { name: 'A. Khan',      subject: 'Mathematics',      classes: ['9-A', '10-A', '11-B'], email: 'a.khan@jeacademy.edu.pk' },
  { name: 'S. Raza',      subject: 'Physics',           classes: ['10-B', '11-A', '12-A'], email: 's.raza@jeacademy.edu.pk' },
  { name: 'F. Ahmed',     subject: 'English',           classes: ['9-B', '9-C', '10-C'],  email: 'f.ahmed@jeacademy.edu.pk' },
  { name: 'N. Siddiqui',  subject: 'Computer Science',  classes: ['11-C', '12-B'],        email: 'n.siddiqui@jeacademy.edu.pk' },
  { name: 'M. Yousuf',    subject: 'Chemistry',         classes: ['10-D', '11-D'],        email: 'm.yousuf@jeacademy.edu.pk' },
  { name: 'R. Baig',      subject: 'Biology',           classes: ['9-D', '12-C'],         email: 'r.baig@jeacademy.edu.pk' },
  { name: 'K. Malik',     subject: 'Urdu',              classes: ['9-A', '9-B', '9-C'],   email: 'k.malik@jeacademy.edu.pk' },
  { name: 'H. Baig',      subject: 'Islamiyat',         classes: ['10-A', '10-B'],        email: 'h.baig@jeacademy.edu.pk' },
]

const INITIALS = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function SuperAdminTeachersPage() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TEACHERS
    return TEACHERS.filter((t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
  }, [query])

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Teaching Staff</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{TEACHERS.length} faculty members · informational directory</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or subject…"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map((t) => (
          <div key={t.email} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[12px] font-bold shrink-0">{INITIALS(t.name)}</div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-neutral-900 truncate">{t.name}</p>
                <p className="text-[11.5px] text-neutral-400 truncate">{t.subject}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {t.classes.map((c) => (
                <span key={c} className="text-[10.5px] font-mono font-semibold text-ink-600 bg-ink-50 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 font-mono truncate">{t.email}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-10 text-[13px] text-neutral-400">No faculty match this search.</div>
        )}
      </div>
    </>
  )
}
