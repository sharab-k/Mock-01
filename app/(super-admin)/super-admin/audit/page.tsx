'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Activity } from 'lucide-react'

const AUDIT_LOG = [
  { actor: 'Ms. Rida Farooq',    action: 'Edited marks',            detail: 'Ahmed Ali · Mathematics · Monthly',            time: '09:42 AM', date: '24 Jun 2026', flag: false },
  { actor: 'Mr. Junaid Karim',   action: 'Marked attendance',       detail: 'Grade 10-A · 24 Jun 2026',                     time: '08:35 AM', date: '24 Jun 2026', flag: false },
  { actor: 'Ms. Asma Tahir',     action: 'Enrolled student',        detail: 'Zara Hussain · JE-2026-047 · Grade 9-B',       time: '08:12 AM', date: '24 Jun 2026', flag: false },
  { actor: 'Ms. Asma Tahir',     action: 'Parent credentials sent', detail: 'Parent of Zara Hussain auto-generated',        time: '08:12 AM', date: '24 Jun 2026', flag: false },
  { actor: 'Mr. Bilal Chaudhry', action: 'Deleted record',          detail: 'Grade 11-A · 20 Jun 2026 — inactive account',  time: '11:04 AM', date: '23 Jun 2026', flag: true  },
  { actor: 'System',             action: 'WhatsApp alert sent',     detail: 'Absent: Usman Sheikh · parent notified',       time: '08:36 AM', date: '24 Jun 2026', flag: false },
  { actor: 'Ms. Rida Farooq',    action: 'Bulk marks upload',       detail: 'Physics Half-Yearly · Grade 11 · 31 students', time: '03:15 PM', date: '22 Jun 2026', flag: false },
  { actor: 'Mr. Kashif Nadeem',  action: 'Edited marks',            detail: 'Sara Khan · English · Half-Yearly',            time: '10:02 AM', date: '22 Jun 2026', flag: false },
  { actor: 'System',             action: 'SMS failover triggered',  detail: 'WhatsApp delivery failed for +9230X · retried', time: '09:00 AM', date: '21 Jun 2026', flag: true },
  { actor: 'Ms. Huma Zaidi',     action: 'Enrolled student',        detail: 'Hamza Latif · JE-2026-046 · Grade 9-B',        time: '02:20 PM', date: '20 Jun 2026', flag: false },
  { actor: 'Mr. Fahad Rasheed',  action: 'Account deactivated',     detail: 'Self-requested leave of absence',              time: '05:00 PM', date: '19 Jun 2026', flag: true  },
]

const ACTORS = ['All Actors', ...Array.from(new Set(AUDIT_LOG.map((e) => e.actor)))]

const INITIALS = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function SuperAdminAuditPage() {
  const [actorFilter, setActorFilter] = useState('All Actors')
  const [flaggedOnly, setFlaggedOnly] = useState(false)

  const filtered = useMemo(() => {
    return AUDIT_LOG.filter((e) => {
      const matchesActor = actorFilter === 'All Actors' || e.actor === actorFilter
      const matchesFlag = !flaggedOnly || e.flag
      return matchesActor && matchesFlag
    })
  }, [actorFilter, flaggedOnly])

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-ink-600" />
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Master Audit Log</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">All system-wide entries, edits, and overrides · {filtered.length} of {AUDIT_LOG.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          {ACTORS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <label className="flex items-center gap-2 text-[12.5px] text-neutral-700 cursor-pointer select-none px-1">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-danger focus:ring-danger/30" />
          Flagged only
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {filtered.map((entry, i) => (
            <div key={i} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors ${entry.flag ? 'border-l-4 border-danger bg-danger-bg/25' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 ${entry.actor === 'System' ? 'bg-ink-100 text-ink-500' : 'bg-ink-100 text-ink-700'}`}>
                {entry.actor === 'System' ? '⚙' : INITIALS(entry.actor)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-neutral-900">{entry.actor}</span>
                  <span className="text-[12px] text-neutral-500">{entry.action}</span>
                  {entry.flag && (
                    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-danger bg-danger-bg border border-danger/20 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Flagged
                    </span>
                  )}
                </div>
                <span className="block text-[11.5px] text-neutral-400 truncate mt-0.5">{entry.detail}</span>
              </div>
              <div className="text-right shrink-0 mt-0.5">
                <span className="block text-[11px] font-mono text-neutral-400">{entry.time}</span>
                <span className="block text-[10px] font-mono text-neutral-300">{entry.date}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">No entries match this filter.</div>
          )}
        </div>
      </div>
    </>
  )
}
