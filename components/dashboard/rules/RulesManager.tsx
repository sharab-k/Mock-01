'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Trash2, Upload } from 'lucide-react'
import { deleteRuleAction, moveRuleAction, setRulesPublishedAction, updateRuleAction } from '@/lib/actions/rules'
import { MAX_RULE_FILES, RULE_IMAGE_ACCEPT } from '@/lib/rules/constants'
import type { RuleDoc } from '@/lib/rules/data'

const INPUT = 'w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10'
const BTN = 'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-60'
const GHOST = 'inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-700 bg-ink-50 hover:bg-ink-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50'

type Note = { tone: 'ok' | 'error'; text: string }

function RuleCard({ rule, first, last, onDone }: { rule: RuleDoc; first: boolean; last: boolean; onDone: (n: Note) => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(rule.title)
  const [description, setDescription] = useState(rule.description ?? '')
  const [busy, setBusy] = useState(false)
  const replaceRef = useRef<HTMLInputElement>(null)
  const dirty = title !== rule.title || description !== (rule.description ?? '')

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setBusy(true)
    const r = await fn()
    setBusy(false)
    onDone(r.ok ? { tone: 'ok', text: okText } : { tone: 'error', text: r.error ?? 'Something went wrong.' })
    if (r.ok) router.refresh()
  }

  async function replace(file: File | undefined) {
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    await run(async () => {
      const res = await fetch(`/api/rules/${rule.id}/image`, { method: 'POST', body })
      return res.ok ? { ok: true } : { ok: false, error: ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Could not replace the picture.' }
    }, 'Picture replaced.')
    if (replaceRef.current) replaceRef.current.value = ''
  }

  return (
    <article className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden grid sm:grid-cols-[200px_1fr]">
      <a href={rule.image_url ?? '#'} target="_blank" rel="noreferrer" className="block bg-neutral-100 aspect-[4/3] sm:aspect-auto sm:min-h-[150px]" aria-label={`Open ${rule.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not a static asset */}
        {rule.image_url ? <img src={rule.image_url} alt={rule.title} className="w-full h-full object-cover" /> : <span className="flex h-full items-center justify-center text-[12px] text-neutral-400">No picture</span>}
      </a>
      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${rule.is_published ? 'bg-success-bg text-success' : 'bg-neutral-100 text-neutral-500'}`}>{rule.is_published ? 'Published' : 'Draft'}</span>
          {rule.published_at && <span className="text-[11px] font-mono text-neutral-400">since {rule.published_at.slice(0, 10)}</span>}
        </div>
        <input className={INPUT} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <textarea className={`${INPUT} min-h-[64px]`} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" aria-label="Description" />
        <div className="flex items-center gap-2 flex-wrap">
          <button disabled={busy || !dirty || !title.trim()} onClick={() => run(() => updateRuleAction({ id: rule.id, title, description }), 'Saved.')} className={GHOST}>Save text</button>
          <button disabled={busy} onClick={() => run(() => setRulesPublishedAction({ ids: [rule.id], published: !rule.is_published }), rule.is_published ? 'Unpublished.' : 'Published — parents can see it now.')} className={GHOST}>
            {rule.is_published ? <><EyeOff size={13} /> Unpublish</> : <><Eye size={13} /> Publish</>}
          </button>
          <button disabled={busy} onClick={() => replaceRef.current?.click()} className={GHOST}><ImagePlus size={13} /> Replace picture</button>
          <input ref={replaceRef} type="file" accept={RULE_IMAGE_ACCEPT} className="hidden" onChange={(e) => replace(e.target.files?.[0])} />
          <button disabled={busy || first} onClick={() => run(() => moveRuleAction({ id: rule.id, direction: 'up' }), 'Moved up.')} className={GHOST} aria-label="Move up"><ArrowUp size={13} /></button>
          <button disabled={busy || last} onClick={() => run(() => moveRuleAction({ id: rule.id, direction: 'down' }), 'Moved down.')} className={GHOST} aria-label="Move down"><ArrowDown size={13} /></button>
          <button disabled={busy} onClick={() => { if (window.confirm(`Delete “${rule.title}”? This cannot be undone.`)) void run(() => deleteRuleAction({ id: rule.id }), 'Deleted.') }} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-danger bg-danger-bg hover:opacity-80 px-2.5 py-1.5 rounded-lg disabled:opacity-50 ml-auto"><Trash2 size={13} /> Delete</button>
        </div>
      </div>
    </article>
  )
}

export default function RulesManager({ rules }: { rules: RuleDoc[] }) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [titles, setTitles] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function choose(list: FileList | null) {
    const picked = Array.from(list ?? []).slice(0, MAX_RULE_FILES)
    setFiles(picked)
    setTitles(picked.map((f) => f.name.replace(/\.[^.]+$/, '')))
    setNote(null)
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    if (files.length === 0) return
    setBusy(true); setNote(null)
    const body = new FormData()
    files.forEach((f, i) => { body.append('files', f); body.append('titles', titles[i] ?? '') })
    const res = await fetch('/api/rules', { method: 'POST', body })
    const json = (await res.json().catch(() => null)) as { error?: string; created?: number; failed?: number } | null
    setBusy(false)
    if (!res.ok) { setNote({ tone: 'error', text: json?.error ?? 'Upload failed.' }); return }
    setNote({ tone: 'ok', text: `Uploaded ${json?.created} picture${json?.created === 1 ? '' : 's'} as drafts. Publish them when they are ready.` })
    setFiles([]); setTitles([])
    if (inputRef.current) inputRef.current.value = ''
    router.refresh()
  }

  async function bulkPublish(published: boolean) {
    const ids = rules.filter((r) => r.is_published !== published).map((r) => r.id)
    if (ids.length === 0) return
    const r = await setRulesPublishedAction({ ids, published })
    setNote(r.ok ? { tone: 'ok', text: published ? 'Everything is published.' : 'Everything is unpublished.' } : { tone: 'error', text: r.error })
    if (r.ok) router.refresh()
  }

  return (
    <>
      <form onSubmit={upload} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-3.5">
        <h2 className="text-[14px] font-semibold text-neutral-900">Upload pictures</h2>
        <p className="text-[12.5px] text-neutral-500">Choose one or several JPG, PNG or WebP pictures (up to {MAX_RULE_FILES} at a time, 6 MB each). Give each a title. They are saved as drafts until you publish them.</p>
        <input ref={inputRef} type="file" multiple accept={RULE_IMAGE_ACCEPT} onChange={(e) => choose(e.target.files)} className="block text-[13px]" aria-label="Pictures" />
        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400 w-5">{i + 1}</span>
                <input className={INPUT} value={titles[i] ?? ''} maxLength={120} onChange={(e) => setTitles((t) => t.map((x, k) => (k === i ? e.target.value : x)))} aria-label={`Title for ${f.name}`} />
              </li>
            ))}
          </ul>
        )}
        <button type="submit" disabled={busy || files.length === 0} className={BTN}><Upload size={14} /> {busy ? 'Uploading…' : `Upload ${files.length || ''} picture${files.length === 1 ? '' : 's'}`}</button>
      </form>

      {note && <p className={`text-[12.5px] rounded-xl px-4 py-2.5 ${note.tone === 'ok' ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`} role={note.tone === 'error' ? 'alert' : 'status'}>{note.text}</p>}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[14px] font-semibold text-neutral-900"><span className="font-mono">{rules.length}</span> picture{rules.length === 1 ? '' : 's'} · <span className="font-mono">{rules.filter((r) => r.is_published).length}</span> published</p>
        <div className="flex gap-2">
          <button onClick={() => bulkPublish(true)} disabled={rules.every((r) => r.is_published)} className={GHOST}>Publish all</button>
          <button onClick={() => bulkPublish(false)} disabled={rules.every((r) => !r.is_published)} className={GHOST}>Unpublish all</button>
        </div>
      </div>

      <div className="space-y-3">
        {rules.map((r, i) => <RuleCard key={`${r.id}-${r.updated_at}`} rule={r} first={i === 0} last={i === rules.length - 1} onDone={setNote} />)}
        {rules.length === 0 && <p className="text-[13px] text-neutral-500 bg-white rounded-2xl border border-neutral-200 p-6 text-center">No pictures yet. Upload the academy’s rules above.</p>}
      </div>
    </>
  )
}
