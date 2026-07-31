'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Activity } from 'lucide-react'
import type { AuditEntry } from '@/lib/audit/fetch'

const INITIALS = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

// audit_log stores one human-readable string per entry (CLAUDE.md §5) —
// split on the "label — detail" convention every logAction() call already
// writes in, so the row keeps its two-line look without a second column.
function splitAction(action: string): { label: string; detail: string } {
  const i = action.indexOf(' — ')
  return i === -1 ? { label: action, detail: '' } : { label: action.slice(0, i), detail: action.slice(i + 3) }
}

export default function SuperAdminAuditContent({ entries }: { entries: AuditEntry[] }) {
  const [actorFilter, setActorFilter] = useState('All Actors')
  const [flaggedOnly, setFlaggedOnly] = useState(false)

  const actors = useMemo(() => ['All Actors', ...Array.from(new Set(entries.map((e) => e.actor)))], [entries])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchesActor = actorFilter === 'All Actors' || e.actor === actorFilter
      const matchesFlag = !flaggedOnly || e.flag
      return matchesActor && matchesFlag
    })
  }, [entries, actorFilter, flaggedOnly])

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
            <p className="text-[13px] text-neutral-500 mt-0.5">All system-wide entries, edits, and overrides · {filtered.length} of {entries.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          {actors.map((a) => <option key={a}>{a}</option>)}
        </select>
        <label className="flex items-center gap-2 text-[12.5px] text-neutral-700 cursor-pointer select-none px-1">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-danger focus:ring-danger/30" />
          Flagged only
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {filtered.map((entry) => {
            const { label, detail } = splitAction(entry.action)
            return (
              <div key={entry.id} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors ${entry.flag ? 'border-l-4 border-danger bg-danger-bg/25' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 bg-ink-100 text-ink-700">
                  {INITIALS(entry.actor)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-neutral-900">{entry.actor}</span>
                    <span className="text-[12px] text-neutral-500">{label}</span>
                    {entry.flag && (
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-danger bg-danger-bg border border-danger/20 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={10} /> Flagged
                      </span>
                    )}
                  </div>
                  {detail && <span className="block text-[11.5px] text-neutral-400 truncate mt-0.5">{detail}</span>}
                </div>
                <div className="text-right shrink-0 mt-0.5">
                  <span className="block text-[11px] font-mono text-neutral-400">{entry.time}</span>
                  <span className="block text-[10px] font-mono text-neutral-300">{entry.date}</span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">No entries match this filter.</div>
          )}
        </div>
      </div>
    </>
  )
}
