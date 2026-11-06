'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Printer, Search, Ticket } from 'lucide-react'
import { generateVouchersAction } from '@/lib/actions/fees'
import { GRADES, sectionsForGrade, type Grade } from '@/lib/students/constants'
import { FEE_STATUSES, MONTH_NAMES, STATUS_LABEL, formatRs, type FeeChargeStatus } from '@/lib/fees/constants'
import type { VoucherCandidate } from '@/lib/fees/vouchers'
import { BTN_GHOST, BTN_PRIMARY, INPUT, StatusPill, TH } from '@/components/dashboard/fees/FeeParts'

const BULK_BATCH = 300

type Props = { year: number; month: number; candidates: VoucherCandidate[] }

export default function SuperAdminVouchersContent({ year, month, candidates }: Props) {
  const router = useRouter()
  const [grade, setGrade] = useState('All')
  const [section, setSection] = useState('All')
  const [status, setStatus] = useState<'All' | 'None' | FeeChargeStatus>('All')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState(`${year}-${String(month).padStart(2, '0')}-10`)
  const [busy, setBusy] = useState<null | 'generate' | 'print'>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const sections = grade === 'All' ? [] : sectionsForGrade(grade as Grade)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return candidates.filter((c) =>
      (grade === 'All' || c.grade === grade) && (section === 'All' || c.section === section)
      && (status === 'All' || (status === 'None' ? !c.voucher : c.voucher?.status === status))
      && (!q || c.full_name.toLowerCase().includes(q) || c.roll_number.toLowerCase().includes(q) || (c.gr_number ?? '').toLowerCase().includes(q)))
  }, [candidates, grade, section, status, query])

  const pickedInView = filtered.filter((c) => picked.has(c.student_id)).length
  const allInViewPicked = filtered.length > 0 && pickedInView === filtered.length
  // Always print/generate for what is ticked, in the order the list shows (class, section, roll).
  const selectedIds = candidates.filter((c) => picked.has(c.student_id)).map((c) => c.student_id)

  const goToMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    router.push(`/super-admin/vouchers?year=${d.getFullYear()}&month=${d.getMonth() + 1}`)
  }
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleView = () => setPicked((p) => { const n = new Set(p); for (const c of filtered) { if (allInViewPicked) n.delete(c.student_id); else n.add(c.student_id) } return n })

  async function generate(): Promise<boolean> {
    const outcome = await generateVouchersAction({ year, month, dueDate, studentIds: selectedIds })
    if (!outcome.ok) { setMessage({ tone: 'error', text: outcome.error }); return false }
    setMessage({ tone: 'ok', text: `Generated ${outcome.generated} voucher${outcome.generated === 1 ? '' : 's'}${outcome.skipped > 0 ? ` (${outcome.skipped} skipped — no longer active)` : ''}.` })
    router.refresh()
    return true
  }

  async function onGenerate() {
    setBusy('generate'); setMessage(null)
    await generate()
    setBusy(null)
  }

  async function onPrint(generateFirst: boolean) {
    setBusy('print'); setMessage(null)
    if (generateFirst && !(await generate())) { setBusy(null); return }
    try {
      for (let i = 0; i < selectedIds.length; i += BULK_BATCH) {
        const res = await fetch('/api/vouchers/pdf', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, month, studentIds: selectedIds.slice(i, i + BULK_BATCH) }),
        })
        if (!res.ok) { setMessage({ tone: 'error', text: ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Could not build the PDF.' }); break }
        const url = URL.createObjectURL(await res.blob())
        const a = document.createElement('a')
        a.href = url
        a.download = selectedIds.length > BULK_BATCH ? `vouchers-part-${i / BULK_BATCH + 1}.pdf` : 'vouchers.pdf'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 30_000)
      }
    } finally { setBusy(null) }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><Ticket size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Fee vouchers</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Generate and print vouchers for a student, a section or a whole class. Students who have left are never listed.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center justify-center gap-4">
        <button onClick={() => goToMonth(-1)} className="p-2 rounded-xl text-neutral-500 hover:text-ink-700 hover:bg-ink-50" aria-label="Previous month"><ChevronLeft size={18} /></button>
        <span className="text-[15px] font-bold text-neutral-900 font-mono min-w-[160px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
        <button onClick={() => goToMonth(1)} className="p-2 rounded-xl text-neutral-500 hover:text-ink-700 hover:bg-ink-50" aria-label="Next month"><ChevronRight size={18} /></button>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, roll, or G.R. no…" className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:bg-white" />
        </div>
        <select value={grade} onChange={(e) => { setGrade(e.target.value); setSection('All') }} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer" aria-label="Class">
          <option value="All">All classes</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={section} onChange={(e) => setSection(e.target.value)} disabled={grade === 'All'} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer disabled:opacity-50" aria-label="Section">
          <option value="All">All sections</option>{sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer" aria-label="Voucher status">
          <option value="All">Any status</option><option value="None">No voucher yet</option>{FEE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-end gap-3 flex-wrap sticky top-2 z-10">
        <div className="flex-1 min-w-[180px]">
          <p className="text-[14px] font-semibold text-neutral-900" aria-live="polite"><span className="font-mono">{selectedIds.length}</span> student{selectedIds.length === 1 ? '' : 's'} selected</p>
          <button onClick={toggleView} disabled={filtered.length === 0} className="text-[12px] font-medium text-ink-600 hover:text-ink-800 disabled:opacity-50">{allInViewPicked ? 'Deselect' : 'Select'} all {filtered.length} shown</button>
          {selectedIds.length > 0 && <button onClick={() => setPicked(new Set())} className="ml-3 text-[12px] font-medium text-neutral-500 hover:text-neutral-800">Clear selection</button>}
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5" htmlFor="v-due">Due date</label>
          <input id="v-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${INPUT} font-mono w-auto`} />
        </div>
        <button onClick={onGenerate} disabled={busy !== null || selectedIds.length === 0 || !dueDate} className={BTN_GHOST}>{busy === 'generate' ? 'Generating…' : 'Generate'}</button>
        <button onClick={() => onPrint(true)} disabled={busy !== null || selectedIds.length === 0 || !dueDate} className={BTN_PRIMARY}><Printer size={14} /> {busy === 'print' ? 'Preparing…' : `Generate and print ${selectedIds.length || ''}`}</button>
      </div>
      {message && <p className={`text-[12.5px] rounded-xl px-4 py-2.5 ${message.tone === 'ok' ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p>}

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead><tr className="bg-neutral-50">
              <th className="pl-5 pr-2 py-3 w-10"><input type="checkbox" checked={allInViewPicked} onChange={toggleView} aria-label="Select all shown" /></th>
              <th className={TH}>Student</th><th className={TH}>Class</th><th className={`${TH} text-right`}>Monthly fee</th>
              <th className={TH}>Voucher</th><th className={`${TH} text-right`}>Outstanding</th><th className={TH}>Status</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((c) => (
                <tr key={c.student_id} className={picked.has(c.student_id) ? 'bg-ink-50/50' : 'hover:bg-neutral-50'}>
                  <td className="pl-5 pr-2 py-3"><input type="checkbox" checked={picked.has(c.student_id)} onChange={() => toggle(c.student_id)} aria-label={`Select ${c.full_name}`} /></td>
                  <td className="px-3 py-3"><span className="font-medium text-neutral-900">{c.full_name}</span><span className="block text-[11px] font-mono text-neutral-400">{c.roll_number}{c.gr_number ? ` · GR ${c.gr_number}` : ''}</span></td>
                  <td className="px-3 py-3 font-mono text-[12px]">{c.grade}{c.section}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right">{c.tuition_fee != null ? formatRs(c.tuition_fee) : <span className="text-warning">not set</span>}</td>
                  <td className="px-3 py-3 font-mono text-[12px]">{c.voucher ? `#${c.voucher.voucher_no}` : '—'}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-right font-semibold">{c.voucher ? formatRs(c.voucher.outstanding) : '—'}</td>
                  <td className="px-3 py-3">{c.voucher ? <StatusPill status={c.voucher.status} /> : <span className="text-[11.5px] text-neutral-400">No voucher</span>}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
