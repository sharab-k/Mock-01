'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Megaphone } from 'lucide-react'
import { NOTICES as INITIAL_NOTICES, CATEGORY_STYLE, type Notice, type NoticeCategory, type NoticeAudience } from '@/lib/mock/notices'

const CATEGORIES: NoticeCategory[] = ['Academic', 'Event', 'Holiday', 'Admissions']
const AUDIENCES: NoticeAudience[] = ['All', 'Students', 'Parents', 'Staff']

const emptyDraft = { title: '', body: '', category: 'Event' as NoticeCategory, audience: 'All' as NoticeAudience }

export default function SuperAdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>(INITIAL_NOTICES)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)

  const openCreate = () => { setEditingId(null); setDraft(emptyDraft); setModalOpen(true) }
  const openEdit = (n: Notice) => { setEditingId(n.id); setDraft({ title: n.title, body: n.body, category: n.category, audience: n.audience }); setModalOpen(true) }

  const save = () => {
    if (!draft.title.trim()) return
    if (editingId) {
      setNotices((prev) => prev.map((n) => n.id === editingId ? { ...n, ...draft } : n))
    } else {
      setNotices((prev) => [{ id: `ntc-${Date.now()}`, ...draft, published_at: 'Just now', published: true }, ...prev])
    }
    setModalOpen(false)
  }

  const togglePublish = (id: string) => {
    setNotices((prev) => prev.map((n) => n.id === id ? { ...n, published: !n.published } : n))
  }

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Notices</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{notices.length} notices · published to the portal and public site</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors">
            <Plus size={14} /> New Notice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {notices.map((n) => (
            <div key={n.id} className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-ink-50 flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone size={15} className="text-ink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[13.5px] font-semibold text-neutral-900">{n.title}</span>
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLE[n.category]}`}>{n.category}</span>
                  {!n.published && <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">Draft</span>}
                </div>
                <p className="text-[12.5px] text-neutral-500 leading-relaxed mb-2 line-clamp-2">{n.body}</p>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                  <span>{n.audience}</span>
                  <span>·</span>
                  <span className="font-mono">{n.published_at}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => togglePublish(n.id)} className="text-[11.5px] font-medium text-neutral-500 hover:text-neutral-800 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
                  {n.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => openEdit(n)} className="text-[11.5px] font-medium text-ink-600 hover:text-ink-800 px-2.5 py-1.5 rounded-lg hover:bg-ink-50 transition-colors">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">{editingId ? 'Edit Notice' : 'New Notice'}</h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Title</label>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Notice title" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Body</label>
                <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} placeholder="Full notice text…" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Category</label>
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as NoticeCategory })} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Audience</label>
                  <select value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value as NoticeAudience })} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                    {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={save} disabled={!draft.title.trim()} className="flex-1 py-3 text-[13px] font-semibold rounded-xl bg-ink-700 text-white hover:bg-ink-800 transition-colors disabled:opacity-50">
                  {editingId ? 'Save Changes' : 'Publish Notice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
