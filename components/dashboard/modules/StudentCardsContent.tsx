'use client'

import { useMemo, useState } from 'react'
import { Download, Loader2, Search } from 'lucide-react'
import StudentIdCard from '@/components/dashboard/StudentIdCard'
import { INITIALS } from '@/lib/students/constants'
import { groupsForGrade } from '@/lib/cards/groups'

export type CardStudent = {
  id: string
  full_name: string
  gr_number: string | null
  roll_number: string
  grade: string
  section: string
  status: 'Active' | 'Inactive'
  fee_status: 'paid' | 'unpaid'
  /** The group printed on the card; null until it has been chosen. */
  card_group: string | null
}

const STATUS_PILL: Record<string, string> = {
  Active: 'bg-success-bg text-success',
  Inactive: 'bg-neutral-100 text-neutral-500',
}
const FEE_PILL: Record<string, string> = {
  paid: 'bg-success-bg text-success',
  unpaid: 'bg-danger-bg text-danger',
}
const SELECT = 'text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer'
const PAGE = 100
// Cards per downloaded PDF — matches the server's limit (lib/cards/build.ts).
const BULK_BATCH = 100

// Super Admin's ID-card list: every student in grade, then G.R. number order
// (the server sends them already sorted), with the same filters as the Students
// directory. The card button opens the download / replace-photo panel.
export default function StudentCardsContent({ students: initialStudents, grades }: { students: CardStudent[]; grades: string[] }) {
  const [students, setStudents] = useState<CardStudent[]>(initialStudents)
  const [groupError, setGroupError] = useState<string | null>(null)
  // Students a blocked bulk download said still need a group, so their rows can be marked.
  const [needGroup, setNeedGroup] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All Grades')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [feeFilter, setFeeFilter] = useState('All Fees')
  const [shown, setShown] = useState(PAGE)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const compact = q.replace(/\s+/g, '')
    return students.filter((s) => {
      const matchesQuery = !q
        || s.full_name.toLowerCase().includes(q)
        || s.roll_number.toLowerCase().includes(q)
        || (s.gr_number ?? '').toLowerCase().replace(/\s+/g, '').includes(compact)
      const matchesGrade = gradeFilter === 'All Grades' || s.grade === gradeFilter
      const matchesStatus = statusFilter === 'All Statuses' || s.status === statusFilter
      const matchesFee = feeFilter === 'All Fees' || (feeFilter === 'Paid' ? s.fee_status === 'paid' : s.fee_status === 'unpaid')
      return matchesQuery && matchesGrade && matchesStatus && matchesFee
    })
  }, [students, query, gradeFilter, statusFilter, feeFilter])

  const visible = filtered.slice(0, shown)
  // Ticked students, or — with nothing ticked — everyone the filters match.
  const targets = useMemo(() => (selected.size > 0 ? filtered.filter((s) => selected.has(s.id)) : filtered), [filtered, selected])
  const allMatchingSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id))
  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllMatching = () => setSelected(allMatchingSelected ? new Set() : new Set(filtered.map((s) => s.id)))

  // Super Admin sets or changes a student's group right in the list.
  async function changeGroup(id: string, group: string) {
    setGroupError(null)
    const res = await fetch(`/api/students/${id}/group`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group }) })
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null
      setGroupError(j?.error ?? 'Could not save the group.')
      return
    }
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, card_group: group } : s)))
    setNeedGroup((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  async function downloadBulk() {
    const ids = targets.map((s) => s.id)
    if (ids.length === 0 || bulk) return
    setBulkError(null)
    setNeedGroup(new Set())
    const parts = Math.ceil(ids.length / BULK_BATCH)
    setBulk({ done: 0, total: parts })
    for (let i = 0; i < parts; i++) {
      const res = await fetch('/api/students/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ids.slice(i * BULK_BATCH, (i + 1) * BULK_BATCH) }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string; code?: string; missing?: { id: string; name: string }[] } | null
        if (j?.code === 'group_required' && j.missing) {
          setNeedGroup(new Set(j.missing.map((m) => m.id)))
          const names = j.missing.slice(0, 4).map((m) => m.name).join(', ') + (j.missing.length > 4 ? ` and ${j.missing.length - 4} more` : '')
          setBulkError(`${j.error} Choose the group in the Group column for: ${names}. Then download again.`)
        } else {
          setBulkError(j?.error ?? 'Could not generate the cards. Please try again.')
        }
        break
      }
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = parts === 1 ? 'id-cards.pdf' : `id-cards-part-${i + 1}-of-${parts}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setBulk({ done: i + 1, total: parts })
    }
    setBulk(null)
  }
  const filtersOn = query || gradeFilter !== 'All Grades' || statusFilter !== 'All Statuses' || feeFilter !== 'All Fees'
  const reset = () => { setQuery(''); setGradeFilter('All Grades'); setStatusFilter('All Statuses'); setFeeFilter('All Fees'); setShown(PAGE) }
  const onFilter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setShown(PAGE) }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-bold text-neutral-900">Student ID cards</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{students.length} students · {filtered.length} matching filters · in G.R. number order</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => onFilter(setQuery)(e.target.value)}
            placeholder="Search by name, G.R. number or roll number…"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
          />
        </div>
        <select value={gradeFilter} onChange={(e) => onFilter(setGradeFilter)(e.target.value)} className={SELECT}>
          <option>All Grades</option>
          {grades.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => onFilter(setStatusFilter)(e.target.value)} className={SELECT}>
          <option>All Statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <select value={feeFilter} onChange={(e) => onFilter(setFeeFilter)(e.target.value)} className={SELECT}>
          <option>All Fees</option>
          <option>Paid</option>
          <option>Unpaid</option>
        </select>
        {filtersOn && <button onClick={reset} className="text-[11.5px] text-ink-600 font-medium">Clear ×</button>}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12.5px] text-neutral-500">
          {selected.size > 0 ? `${selected.size} selected` : `Nothing ticked — the button below prints all ${filtered.length} matching students`}
          {selected.size > 0 && <button type="button" onClick={() => setSelected(new Set())} className="ml-2 text-ink-600 font-medium">Clear selection</button>}
        </p>
        <div className="flex items-center gap-3">
          {bulkError && <span className="text-[12px] text-danger" role="alert">{bulkError}</span>}
          {groupError && <span className="text-[12px] text-danger" role="alert">{groupError}</span>}
          <button
            type="button"
            onClick={downloadBulk}
            disabled={targets.length === 0 || bulk !== null}
            className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white bg-ink-700 px-3.5 py-2 rounded-xl hover:bg-ink-600 transition-colors disabled:opacity-60"
          >
            {bulk ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {bulk ? `Preparing ${bulk.done + 1} of ${bulk.total}…` : `Download ${targets.length} card${targets.length === 1 ? '' : 's'} (PDF)`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[820px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="pl-5 pr-1 py-3 w-8">
                  <input type="checkbox" checked={allMatchingSelected} onChange={toggleAllMatching} aria-label="Select all matching students" className="accent-ink-700 cursor-pointer" />
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">G.R. No</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Group</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Fees</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-right">ID card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((s) => (
                <tr key={s.id} className={`hover:bg-neutral-50 transition-colors ${s.status === 'Inactive' ? 'opacity-60' : ''}`}>
                  <td className="pl-5 pr-1 py-3">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.full_name}`} className="accent-ink-700 cursor-pointer" />
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-neutral-700 whitespace-nowrap">{s.gr_number ?? '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(s.full_name)}</div>
                      <div className="min-w-0">
                        <span className="block font-medium text-neutral-900 truncate">{s.full_name}</span>
                        <span className="block text-[11px] font-mono text-neutral-400">{s.roll_number}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-neutral-700">{s.grade}{s.section}</td>
                  <td className="px-3 py-3">
                    <select
                      aria-label={`Group for ${s.full_name}`}
                      value={s.card_group ?? ''}
                      onChange={(e) => e.target.value && void changeGroup(s.id, e.target.value)}
                      className={`text-[12px] border rounded-lg px-2 py-1.5 bg-white text-neutral-800 focus:outline-none focus:border-ink-400 max-w-[150px] ${!s.card_group ? (needGroup.has(s.id) ? 'border-danger ring-1 ring-danger' : 'border-warning') : 'border-neutral-200'}`}
                    >
                      {!s.card_group && <option value="">Choose group…</option>}
                      {groupsForGrade(s.grade).map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${FEE_PILL[s.fee_status]}`}>{s.fee_status === 'paid' ? 'Paid' : 'Unpaid'}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <StudentIdCard studentId={s.id} studentName={s.full_name} role="super_admin" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > shown && (
          <div className="border-t border-neutral-100 p-3 text-center">
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="text-[12.5px] font-semibold text-ink-700 hover:underline">
              Show more ({filtered.length - shown} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
