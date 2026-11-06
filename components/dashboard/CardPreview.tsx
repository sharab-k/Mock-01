'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// The card is 141.75 x 240.75 pt; pages render at 3x so the text stays sharp.
const SCALE = 3
const SIDES = ['Front', 'Back'] as const

// Shows the real generated card PDF — front and back — by drawing its pages onto
// canvases, so what the site shows is exactly what is downloaded and printed.
export default function CardPreview({ pdf }: { pdf: ArrayBuffer | null }) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([])
  const [state, setState] = useState<'idle' | 'ready' | 'failed'>('idle')

  useEffect(() => {
    if (!pdf) return
    let cancelled = false
    let destroy: (() => Promise<void>) | null = null
    setState('idle')

    void (async () => {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf.slice(0)) }).promise
      destroy = () => doc.destroy()
      for (let n = 1; n <= Math.min(doc.numPages, SIDES.length); n++) {
        const page = await doc.getPage(n)
        const canvas = canvases.current[n - 1]
        const ctx = canvas?.getContext('2d')
        if (cancelled || !canvas || !ctx) return
        const viewport = page.getViewport({ scale: SCALE })
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: ctx, viewport }).promise
      }
      if (!cancelled) setState('ready')
    })().catch(() => { if (!cancelled) setState('failed') })

    return () => { cancelled = true; void destroy?.() }
  }, [pdf])

  if (state === 'failed') {
    return <p className="text-[12.5px] text-neutral-500 bg-neutral-50 rounded-xl px-3 py-6 text-center">The preview could not be shown here. Use Download to open the card.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3" aria-label="ID card preview">
      {SIDES.map((side, i) => (
        <figure key={side} className="m-0">
          <div className="relative rounded-lg border border-neutral-200 shadow-sm overflow-hidden bg-neutral-50" style={{ aspectRatio: '141.75 / 240.75' }}>
            <canvas ref={(el) => { canvases.current[i] = el }} className="w-full h-full block" role="img" aria-label={`ID card ${side.toLowerCase()}`} />
            {state === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-neutral-400" /></div>
            )}
          </div>
          <figcaption className="mt-1.5 text-center text-[11px] font-medium text-neutral-500">{side}</figcaption>
        </figure>
      ))}
    </div>
  )
}
