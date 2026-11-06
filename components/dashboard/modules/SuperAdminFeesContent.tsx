'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, Wallet, CheckCircle2, Banknote, Receipt, Sparkles } from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import { GRADES } from '@/lib/students/constants'
import { generateMonthlyChargesAction } from '@/lib/actions/fees'
import { FEE_STATUSES, MONTH_NAMES, STATUS_LABEL, formatRs, type FeeChargeStatus } from '@/lib/fees/constants'
import type { MonthRow } from '@/lib/fees/ledger'
import { BTN_GHOST, BTN_PRIMARY, INPUT, StatusPill, TH, RecordPaymentDialog, type PayTarget } from '@/components/dashboard/fees/FeeParts'

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

type Props = {
  year: number
  month: number
  rows: MonthRow[]
  collected: number
  receiptCount: number
  outstanding: number
}

export default function SuperAdminFeesContent({ year, month, rows, collected, receiptCount, outstanding }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All Grades')
  const [statusFilter, setStatusFilter] = useState<'All' | 'No charge' | FeeChargeStatus>('All')
  const [pay, setPay] = useState<PayTarget | null>(null)
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState(`${year}-${String(month).padStart(2, '0')}-10`)

  const goToMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    router.push(`/super-admin/fees?year=${d.getFullYear()}&month=${d.getMonth() + 1}`)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(({ student: s, charge }) => {
      const matchesQuery = !q || s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q) || (s.gr_number ?? '').toLowerCase().includes(q)
      const matchesGrade = gradeFilter === 'All Grades' || s.grade === gradeFilter
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'No charge' ? !charge : charge?.status === statusFilter)
      return matchesQuery && matchesGrade && matchesStatus
    })
  }, [rows, query, gradeFilter, statusFilter])

  const withCharge = rows.filter((r) => r.charge)
  const paidCount = withCharge.filter((r) => r.charge?.status === 'paid').length
  const noCharge = rows.length - withCharge.length

  async function generate() {
    setGenerating(true); setNotice(null)
    const outcome = await generateMonthlyChargesAction({ year, month, dueDate })
    setGenerating(false)
    if (!outcome.ok) { setNotice(outcome.error); return }
    setNotice(outcome.created > 0 ? `Created ${outcome.created} tuition charge${outcome.created === 1 ? '' : 's'} for ${MONTH_NAMES[month - 1]}.` : 'Every student with a fee set already has this month’s charge.')
    router.refresh()
  }

  const STATS = [
    { label: 'Collected', value: formatRs(collected), icon: <Banknote size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: `${MONTH_NAMES[month - 1]} · ${receiptCount} receipt${receiptCount === 1 ? '' : 's'}` },
    { label: 'Total outstanding', value: formatRs(outstanding), icon: <Wallet size={22} />, iconBg: outstanding > 0 ? 'bg-warning-bg' : 'bg-neutral-100', iconColor: outstanding > 0 ? 'text-warning' : 'text-neutral-400', sub: 'All months, all students' },
    { label: 'Paid this month', value: `${paidCount} / ${withCharge.length}`, icon: <CheckCircle2 size={22} />, iconBg: 'bg-ink-100', iconColor: 'text-ink-600', sub: noCharge > 0 ? `${noCharge} without a charge` : 'Every student charged' },
  ]

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><Wallet size={18} className="text-ink-600" /></div>
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Fees</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">Monthly tuition, payments and what is still owed — Super Admin only</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/super-admin/fees/payments" className={`${BTN_GHOST} no-underline`}><Receipt size={14} /> Payments</Link>
          <Link href="/super-admin/fees/heads" className={`${BTN_GHOST} no-underline`}>Fee heads</Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center justify-center gap-4">
        <button onClick={() => goToMonth(-1)} className="p-2 rounded-xl text-neutral-500 hover:text-ink-700 hover:bg-ink-50 transition-colors" aria-label="Previous month"><ChevronLeft size={18} /></button>
        <span className="text-[15px] font-bold text-neutral-900 font-mono min-w-[160px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
        <button onClick={() => goToMonth(1)} className="p-2 rounded-xl text-neutral-500 hover:text-ink-700 hover:bg-ink-50 transition-colors" aria-label="Next month"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{STATS.map((s) => <StatCard key={s.label} {...s} />)}</div>

      {noCharge > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <p className="text-[13px] font-semibold text-neutral-900">{noCharge} student{noCharge === 1 ? ' has' : 's have'} no {MONTH_NAMES[month - 1]} charge yet</p>
            <p className="text-[12.5px] text-neutral-500 mt-0.5">Creates the tuition charge from each student’s monthly fee, less their discount. Students with no fee set are skipped.</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5" htmlFor="gen-due">Due date</label>
            <input id="gen-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${INPUT} font-mono`} />
          </div>
          <button onClick={generate} disabled={generating || !dueDate} className={BTN_PRIMARY}><Sparkles size={14} /> {generating ? 'Generating…' : 'Generate charges'}</button>
        </div>
      )}
      {notice && <p className="text-[12.5px] text-ink-700 bg-ink-50 rounded-xl px-4 py-2.5" role="status">{notice}</p>}

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, roll, or G.R. no…" className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white cursor-pointer" aria-label="Grade">
          <option>All Grades</option>
          {GRADES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white cursor-pointer" aria-label="Status">
          <option value="All">All statuses</option>
          {FEE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          <option value="No charge">No charge</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead>
              <tr className="bg-neutral-50">
                <th className={`${TH} pl-5`}>Student</th><th className={TH}>Class</th>
                <th className={`${TH} text-right`}>Due</th><th className={`${TH} text-right`}>Paid</th><th className={`${TH} text-right`}>Outstanding</th>
                <th className={TH}>Status</th><th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map(({ student: s, charge }) => (
                <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="pl-5 pr-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(s.full_name)}</div>
                      <div className="min-w-0">
                        <Link href={`/super-admin/fees/student/${s.id}`} className="block font-medium text-neutral-900 hover:text-ink-700 truncate no-underline">{s.full_name}</Link>
                        <span className="block text-[11px] font-mono text-neutral-400">{s.roll_number}{s.gr_number ? ` · GR ${s.gr_number}` : ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-neutral-700">{s.grade}{s.section}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right text-neutral-700">{charge ? formatRs(charge.due) : '—'}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right text-neutral-700">{charge ? formatRs(charge.paid) : '—'}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right font-semibold text-neutral-900">{charge ? formatRs(charge.outstanding) : '—'}</td>
                  <td className="px-3 py-3">{charge ? <StatusPill status={charge.status} /> : <span className="text-[11.5px] text-neutral-400">No charge</span>}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {charge && charge.outstanding > 0 && (
                        <button onClick={() => setPay({ studentId: s.id, studentName: s.full_name, chargeId: charge.charge_id, label: `${charge.head_name} · ${MONTH_NAMES[month - 1]} ${year}`, outstanding: charge.outstanding })} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg text-success bg-success-bg hover:bg-success/10 transition-colors">Record payment</button>
                      )}
                      <Link href={`/super-admin/fees/student/${s.id}`} className="text-[11.5px] font-medium text-ink-600 hover:text-ink-800 no-underline">Ledger</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {pay && <RecordPaymentDialog target={pay} onClose={() => setPay(null)} />}
    </>
  )
}
