'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Plus, X, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { createTeacherAction, updateTeacherAction, deleteTeacherAction } from '@/lib/actions/teachers'
import type { Teacher } from '@/lib/teachers/fetch'

const INITIALS = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

type Draft = { fullName: string; subject: string; classes: string; email: string; phone: string }
const emptyDraft: Draft = { fullName: '', subject: '', classes: '', email: '', phone: '' }

function toDraft(t: Teacher): Draft {
  return { fullName: t.full_name, subject: t.subject, classes: t.classes.join(', '), email: t.email ?? '', phone: t.phone ?? '' }
}

export default function SuperAdminTeachersContent({ initialTeachers }: { initialTeachers: Teacher[] }) {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers)
  const [query, setQuery] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null)
  const [deleting, setDeleting] = useState(false)

  const q = query.trim().toLowerCase()
  const filtered = teachers.filter((t) => !q || t.full_name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))

  const openCreate = () => { setEditingId(null); setDraft(emptyDraft); setError(''); setModalOpen(true) }
  const openEdit = (t: Teacher) => { setEditingId(t.id); setDraft(toDraft(t)); setError(''); setModalOpen(true) }

  const save = async () => {
    if (!draft.fullName.trim() || !draft.subject.trim()) return
    setSaving(true)
    setError('')

    const classes = draft.classes.split(',').map((c) => c.trim()).filter(Boolean)
    const payload = { fullName: draft.fullName.trim(), subject: draft.subject.trim(), classes, email: draft.email.trim(), phone: draft.phone.trim() }

    if (editingId) {
      const outcome = await updateTeacherAction({ id: editingId, ...payload })
      setSaving(false)
      if (!outcome.ok) { setError(outcome.error); return }
      setTeachers((prev) => prev.map((t) => t.id === editingId
        ? { ...t, full_name: payload.fullName, subject: payload.subject, classes, email: payload.email || null, phone: payload.phone || null }
        : t))
    } else {
      const outcome = await createTeacherAction(payload)
      setSaving(false)
      if (!outcome.ok) { setError(outcome.error); return }
      setTeachers((prev) => [...prev, {
        id: outcome.id, full_name: payload.fullName, subject: payload.subject, classes,
        email: payload.email || null, phone: payload.phone || null,
      }].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    }
    setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const outcome = await deleteTeacherAction({ id: deleteTarget.id })
    setDeleting(false)
    if (outcome.ok) setTeachers((prev) => prev.filter((t) => t.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Teaching Staff</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{teachers.length} faculty members</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors">
            <Plus size={14} /> Add Teacher
          </button>
        </div>
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
          <div key={t.id} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[12px] font-bold shrink-0">{INITIALS(t.full_name)}</div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-neutral-900 truncate">{t.full_name}</p>
                <p className="text-[11.5px] text-neutral-400 truncate">{t.subject}</p>
              </div>
            </div>
            {t.classes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {t.classes.map((c) => (
                  <span key={c} className="text-[10.5px] font-mono font-semibold text-ink-600 bg-ink-50 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            )}
            {t.email && <p className="text-[11px] text-neutral-400 font-mono truncate mb-3">{t.email}</p>}
            <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
              <button onClick={() => openEdit(t)} className="flex-1 flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-ink-600 hover:text-ink-800 py-1.5 rounded-lg hover:bg-ink-50 transition-colors">
                <Pencil size={12} /> Edit
              </button>
              <button onClick={() => setDeleteTarget(t)} className="flex-1 flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-danger hover:text-danger/80 py-1.5 rounded-lg hover:bg-danger-bg transition-colors">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-10 text-[13px] text-neutral-400">No faculty match this search.</div>
        )}
      </div>

      {/* Create / edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !saving && setModalOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">{editingId ? 'Edit Teacher' : 'Add Teacher'}</h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-danger-bg border border-danger/20 rounded-xl p-3.5">
                  <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
                  <p className="text-[12.5px] text-danger leading-relaxed">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Full name</label>
                <input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} placeholder="e.g. Mr. Ahmed Khan" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Subject</label>
                <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="e.g. Mathematics" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Classes <span className="text-neutral-400 font-normal">(comma-separated, e.g. 9-A, 10-B)</span></label>
                <input value={draft.classes} onChange={(e) => setDraft({ ...draft, classes: e.target.value })} placeholder="9-A, 10-B, 11-C" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Email <span className="text-neutral-400 font-normal">(optional)</span></label>
                  <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="name@jeacademy.edu.pk" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Phone <span className="text-neutral-400 font-normal">(optional)</span></label>
                  <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="03XX XXXXXXX" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={save} disabled={!draft.fullName.trim() || !draft.subject.trim() || saving} className="flex-1 py-3 text-[13px] font-semibold rounded-xl bg-ink-700 text-white hover:bg-ink-800 transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Teacher'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-danger-bg flex items-center justify-center">
                  <AlertTriangle size={18} className="text-danger" />
                </div>
                <h3 className="text-[15px] font-bold text-neutral-900">Remove teacher?</h3>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] text-neutral-600 leading-relaxed mb-5">
                {deleteTarget.full_name} will be removed from the teaching staff directory.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-60">Cancel</button>
                <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-3 text-[13px] font-semibold rounded-xl text-white bg-danger hover:bg-danger/90 transition-colors disabled:opacity-60">{deleting ? 'Removing…' : 'Remove'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
