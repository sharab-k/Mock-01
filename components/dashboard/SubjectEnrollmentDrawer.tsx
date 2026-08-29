'use client'

import { useEffect, useState } from 'react'
import { X, Search } from 'lucide-react'
import { fetchSubjectEnrollmentRoster, setSubjectEnrollmentAction, type EnrollmentRosterStudent } from '@/lib/actions/subject-enrollments'
import type { Subject } from '@/lib/actions/subjects'

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function SubjectEnrollmentDrawer({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const [roster, setRoster] = useState<EnrollmentRosterStudent[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let mounted = true
    fetchSubjectEnrollmentRoster(subject.id).then((result) => {
      if (!mounted) return
      if (!result.ok) { setError(result.error); return }
      setRoster(result.roster)
      setSelected(new Set(result.roster.filter((s) => s.enrolled).map((s) => s.id)))
    })
    return () => { mounted = false }
  }, [subject.id])

  const filtered = (roster ?? []).filter((s) => {
    const q = query.trim().toLowerCase()
    return !q || s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
  })

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const outcome = await setSubjectEnrollmentAction({ subjectId: subject.id, studentIds: Array.from(selected) })
    setSaving(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md h-full bg-white shadow-2xl z-10 flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-neutral-900">{subject.name}</h3>
            <p className="text-[12px] text-neutral-500 mt-0.5">Grade {subject.gradeLevel} · Elected subject enrollment</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {error && <p className="px-6 py-3 text-[12.5px] text-danger">{error}</p>}

        {!error && !roster && <div className="flex-1 flex items-center justify-center text-[13px] text-neutral-400">Loading roster…</div>}

        {roster && (
          <>
            <div className="px-6 py-3 border-b border-neutral-100 shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or roll…" className="w-full pl-8 pr-3 py-2 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <p className="text-[11.5px] text-neutral-400 mt-2">{selected.size} of {roster.length} students enrolled</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {filtered.map((s) => (
                <label key={s.id} className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-neutral-50 transition-colors">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 rounded border-neutral-300 text-ink-600 focus:ring-ink-400/30" />
                  <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(s.fullName)}</div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-neutral-900 truncate">{s.fullName}</span>
                    <span className="block text-[11px] font-mono text-neutral-400">{s.rollNumber}</span>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && <p className="px-6 py-8 text-center text-[13px] text-neutral-400">No students match.</p>}
            </div>

            <div className="px-6 py-4 border-t border-neutral-100 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-3 text-[13px] font-semibold rounded-xl transition-colors disabled:opacity-60 ${saved ? 'bg-success-bg text-success' : 'bg-ink-700 text-white hover:bg-ink-800'}`}
              >
                {saved ? 'Saved' : saving ? 'Saving…' : 'Save Enrollment'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
