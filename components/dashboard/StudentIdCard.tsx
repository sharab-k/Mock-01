'use client'

/* eslint-disable @next/next/no-img-element -- a private blob: URL cannot go through next/image */

import { useCallback, useEffect, useRef, useState } from 'react'
import { IdCard, Loader2, Upload, Download, X, AlertCircle } from 'lucide-react'

type Props = {
  studentId: string
  studentName: string
  /** Parents may upload the picture once; a Super Admin can always replace it. */
  role: 'parent' | 'super_admin'
  className?: string
}

const BUTTON = 'inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-600 bg-ink-50 border border-ink-100 px-3.5 py-2 rounded-xl hover:bg-ink-100 transition-colors'

export default function StudentIdCard({ studentId, studentName, role, className }: Props) {
  const [open, setOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<'upload' | 'download' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadPhoto = useCallback(async () => {
    setLoaded(false)
    const res = await fetch(`/api/students/${studentId}/photo`, { cache: 'no-store' })
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (res.ok) setPhotoUrl(URL.createObjectURL(await res.blob()))
    setLoaded(true)
  }, [studentId])

  useEffect(() => {
    if (open) void loadPhoto()
  }, [open, loadPhoto])

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  const canUpload = role === 'super_admin' || !photoUrl

  const upload = async (file: File) => {
    setError(null)
    setBusy('upload')
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`/api/students/${studentId}/photo`, { method: 'POST', body })
    setBusy(null)
    if (fileRef.current) fileRef.current.value = ''
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null
      setError(j?.error ?? 'Could not upload the picture.')
      if (res.status === 409) void loadPhoto()
      return
    }
    void loadPhoto()
  }

  const download = async () => {
    setError(null)
    setBusy('download')
    const res = await fetch(`/api/students/${studentId}/card`)
    setBusy(null)
    if (!res.ok) { setError('Could not generate the card. Please try again.'); return }
    const blob = await res.blob()
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'id-card.pdf'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? BUTTON}>
        <IdCard size={13} /> ID Card
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Student ID card" className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-neutral-900">Student ID Card</h2>
                <p className="text-[12.5px] text-neutral-500 mt-0.5">{studentName}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="w-[84px] h-[100px] rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                {!loaded ? <Loader2 size={16} className="animate-spin text-neutral-400" />
                  : photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[11px] text-neutral-400 text-center px-1">No picture yet</span>}
              </div>
              <p className="text-[12.5px] text-neutral-600 leading-relaxed">
                {role === 'parent'
                  ? photoUrl
                    ? 'The picture is saved. To change it, please contact the academy office.'
                    : 'Upload a clear, front-facing picture of the student for the card.'
                  : 'As Super Admin you can replace the picture at any time.'}
              </p>
            </div>

            {role === 'parent' && !photoUrl && loaded && (
              <p className="mt-3 flex gap-2 text-[12px] text-warning bg-warning-bg rounded-xl px-3 py-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span><b>Note:</b> you can upload the picture only one time. Please choose it carefully.</span>
              </p>
            )}
            {error && <p className="mt-3 text-[12px] text-danger bg-danger-bg rounded-xl px-3 py-2" role="alert">{error}</p>}

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f) }} />

            <div className="mt-4 flex gap-2 flex-wrap">
              {loaded && canUpload && (
                <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()} className={BUTTON}>
                  {busy === 'upload' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {photoUrl ? 'Change picture' : 'Upload picture'}
                </button>
              )}
              <button type="button" disabled={busy !== null} onClick={download}
                className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white bg-ink-700 px-3.5 py-2 rounded-xl hover:bg-ink-600 transition-colors disabled:opacity-60">
                {busy === 'download' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Download card
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
