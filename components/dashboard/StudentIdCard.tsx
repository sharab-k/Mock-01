'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { IdCard, Loader2, Upload, Download, Printer, X, AlertCircle } from 'lucide-react'
import CardPreview from '@/components/dashboard/CardPreview'

type Props = {
  studentId: string
  studentName: string
  /** Parents may upload the picture once; a Super Admin can always replace it. */
  role: 'parent' | 'super_admin'
  className?: string
}

const BUTTON = 'inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-600 bg-ink-50 border border-ink-100 px-3.5 py-2 rounded-xl hover:bg-ink-100 transition-colors disabled:opacity-60'

export default function StudentIdCard({ studentId, studentName, role, className }: Props) {
  const [open, setOpen] = useState(false)
  // The generated card, exactly as it downloads: shown in the preview and reused for Download / Print.
  const [card, setCard] = useState<{ pdf: ArrayBuffer; fileName: string } | null>(null)
  const [hasPhoto, setHasPhoto] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<'upload' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadCard = useCallback(async () => {
    setCard(null)
    const [photoRes, cardRes] = await Promise.all([
      fetch(`/api/students/${studentId}/photo`, { cache: 'no-store' }),
      fetch(`/api/students/${studentId}/card`, { cache: 'no-store' }),
    ])
    void photoRes.body?.cancel()
    setHasPhoto(photoRes.ok)
    if (!cardRes.ok) { setError('Could not generate the card. Please try again.'); return }
    const fileName = /filename="([^"]+)"/.exec(cardRes.headers.get('Content-Disposition') ?? '')?.[1] ?? 'id-card.pdf'
    setCard({ pdf: await cardRes.arrayBuffer(), fileName })
  }, [studentId])

  useEffect(() => {
    if (open) void loadCard()
  }, [open, loadCard])

  const canUpload = role === 'super_admin' || hasPhoto === false

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
      if (res.status !== 409) return
    }
    void loadCard()
  }

  const withBlobUrl = (action: (url: string) => void) => {
    if (!card) return
    const url = URL.createObjectURL(new Blob([card.pdf], { type: 'application/pdf' }))
    action(url)
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const download = () => withBlobUrl((url) => {
    const a = document.createElement('a')
    a.href = url
    a.download = card?.fileName ?? 'id-card.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
  })

  // The browser's own PDF viewer has the print button, and prints at the card's real size.
  const print = () => withBlobUrl((url) => { window.open(url, '_blank', 'noopener') })

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? BUTTON}>
        <IdCard size={13} /> ID Card
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Student ID card" className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-neutral-900">Student ID Card</h2>
                <p className="text-[12.5px] text-neutral-500 mt-0.5">{studentName}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
            </div>

            <div className="mt-4">
              <CardPreview pdf={card?.pdf ?? null} />
            </div>

            <p className="mt-3 text-[12px] text-neutral-500 leading-relaxed">
              {role === 'parent'
                ? hasPhoto
                  ? 'The picture is saved. To change it, please contact the academy office.'
                  : 'Upload a clear, front-facing picture of the student for the card.'
                : 'As Super Admin you can replace the picture at any time.'}
            </p>

            {role === 'parent' && hasPhoto === false && (
              <p className="mt-3 flex gap-2 text-[12px] text-warning bg-warning-bg rounded-xl px-3 py-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span><b>Note:</b> you can upload the picture only one time. Please choose it carefully.</span>
              </p>
            )}
            {error && <p className="mt-3 text-[12px] text-danger bg-danger-bg rounded-xl px-3 py-2" role="alert">{error}</p>}

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f) }} />

            <div className="mt-4 flex gap-2 flex-wrap">
              {hasPhoto !== null && canUpload && (
                <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()} className={BUTTON}>
                  {busy === 'upload' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {hasPhoto ? 'Change picture' : 'Upload picture'}
                </button>
              )}
              <button type="button" disabled={!card || busy !== null} onClick={download}
                className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white bg-ink-700 px-3.5 py-2 rounded-xl hover:bg-ink-600 transition-colors disabled:opacity-60">
                <Download size={13} /> Download card
              </button>
              <button type="button" disabled={!card || busy !== null} onClick={print} className={BUTTON}>
                <Printer size={13} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
