'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Loader2 } from 'lucide-react'
import { searchStudentsAction } from '@/lib/actions/student-search'
import type { StudentSearchHit } from '@/lib/students/record'

export default function StudentSearchContent() {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<StudentSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setError(null)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      const res = await searchStudentsAction(q)
      if (res.ok) { setHits(res.students); setError(null) } else setError(res.error)
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Student search</h1>
        <p className="text-sm text-neutral-600">Find any student by name, G.R. number or roll number to see their full record.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or G.R. number…"
          className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-9 pr-9 text-sm text-neutral-900 focus:border-ink-600 focus:outline-none"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-500" />}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && query.trim().length >= 2 && !loading && hits.length === 0 && (
        <p className="text-sm text-neutral-600">No students match &ldquo;{query.trim()}&rdquo;.</p>
      )}
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {hits.map((s) => (
          <li key={s.id}>
            <Link href={`/super-admin/search/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{s.fullName}</p>
                <p className="font-mono text-xs text-neutral-600">GR {s.grNumber ?? '—'} · Roll {s.rollNumber}</p>
              </div>
              <span className="shrink-0 text-xs text-neutral-600">Grade {s.grade}-{s.section}{s.status !== 'active' ? ' · Inactive' : ''}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
