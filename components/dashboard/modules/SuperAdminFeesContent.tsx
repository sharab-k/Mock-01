'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, Wallet, CheckCircle2, XCircle, DollarSign } from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import { GRADES } from '@/lib/students/constants'
import { setFeeStatusAction } from '@/lib/actions/fees'
import type { FeeRosterRow } from '@/lib/fees/roster'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

type Props = {
  year: number
  month: number
  students: FeeRosterRow[]
}

export default function SuperAdminFeesContent({ year, month, students: initialStudents }: Props) {
  const router = useRouter()
  const [students, setStudents] = useState<FeeRosterRow[]>(initialStudents)
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All Grades')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const goToMonth = (deltaMonths: number) => {
    const d = new Date(year, month - 1 + deltaMonths, 1)
    router.push(`/super-admin/fees?year=${d.getFullYear()}&month=${d.getMonth() + 1}`)
  }

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = query.trim().toLowerCase()
      const matchesQuery = !q || s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q) || (s.gr_number ?? '').toLowerCase().includes(q)
      const matchesGrade = gradeFilter === 'All Grades' || s.grade === gradeFilter
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'Paid' ? s.status === 'paid' : s.status === 'unpaid')
      return matchesQuery && matchesGrade && matchesStatus
    })
  }, [students, query, gradeFilter, statusFilter])

  const paidCount = students.filter((s) => s.status === 'paid').length
  const unpaidCount = students.length - paidCount
  const collectionPct = students.length > 0 ? Math.round((paidCount / students.length) * 100) : 0

  const STATS = [
    { label: 'Fees Paid',   value: String(paidCount),   icon: <CheckCircle2 size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: `of ${students.length} students`, subUp: true },
    { label: 'Fees Unpaid', value: String(unpaidCount), icon: <XCircle size={22} />,       iconBg: unpaidCount > 0 ? 'bg-danger-bg' : 'bg-neutral-100', iconColor: unpaidCount > 0 ? 'text-danger' : 'text-neutral-400', sub: unpaidCount > 0 ? 'Action required' : 'All paid' },
    { label: 'Collection',  value: `${collectionPct}%`, icon: <DollarSign size={22} />,    iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: `${MONTH_NAMES[month - 1]} ${year}` },
  ]

  const toggleStatus = async (s: FeeRosterRow) => {
    const nextStatus = s.status === 'paid' ? 'unpaid' : 'paid'
    setPendingId(s.id)
    setStudents((prev) => prev.map((p) => p.id === s.id ? { ...p, status: nextStatus } : p))
    const outcome = await setFeeStatusAction({ studentId: s.id, studentName: s.full_name, year, month, status: nextStatus })
    setPendingId(null)
    if (!outcome.ok) {
      // Revert on failure
      setStudents((prev) => prev.map((p) => p.id === s.id ? { ...p, status: s.status } : p))
    }
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-ink-600" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Fees</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">Monthly fee status — Super Admin only</p>
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center justify-center gap-4">
        <button onClick={() => goToMonth(-1)} className="p-2 rounded-xl text-neutral-500 hover:text-ink-700 hover:bg-ink-50 transition-colors" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className="text-[15px] font-bold text-neutral-900 font-mono min-w-[160px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
        <button onClick={() => goToMonth(1)} className="p-2 rounded-xl text-neutral-500 hover:text-ink-700 hover:bg-ink-50 transition-colors" aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, roll, or G.R. no…" className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          <option>All Grades</option>
          {GRADES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          <option value="All">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[520px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(s.full_name)}</div>
                      <div className="min-w-0">
                        <span className="block font-medium text-neutral-900 truncate">{s.full_name}</span>
                        <span className="block text-[11px] font-mono text-neutral-400">
                          {s.roll_number}{s.gr_number ? ` · GR ${s.gr_number}` : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[12px] text-neutral-700">{s.grade}{s.section}</td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.status === 'paid' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                      {s.status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <button
                      onClick={() => toggleStatus(s)}
                      disabled={pendingId === s.id}
                      className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60 ${
                        s.status === 'paid'
                          ? 'text-danger bg-danger-bg hover:bg-danger/10'
                          : 'text-success bg-success-bg hover:bg-success/10'
                      }`}
                    >
                      {pendingId === s.id ? 'Saving…' : s.status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
