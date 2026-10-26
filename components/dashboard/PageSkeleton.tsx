// Shown by every portal's loading.tsx while a page's data is being fetched. The
// sidebar and top bar (from the layout) stay on screen; only this placeholder
// stands in for the page, so a click answers at once instead of freezing.
// Plain server component, neutral tones only (design system §6).
const BAR = 'rounded-lg bg-neutral-200/70 animate-pulse'

export default function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="space-y-2">
        <div className={`${BAR} h-6 w-56`} />
        <div className={`${BAR} h-3.5 w-80 max-w-full`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
            <div className={`${BAR} h-3 w-20`} />
            <div className={`${BAR} h-7 w-16`} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100 last:border-0">
            <div className="w-8 h-8 rounded-full bg-neutral-200/70 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className={`${BAR} h-3.5 w-1/3`} />
              <div className={`${BAR} h-3 w-1/4`} />
            </div>
            <div className={`${BAR} h-5 w-16 hidden sm:block`} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
