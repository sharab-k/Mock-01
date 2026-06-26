export default function VisitSection() {
  return (
    <section className="bg-white py-20 sm:py-28" id="visit-us">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-md bg-ink-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-ink-600" />
              </div>
              <span className="text-ink-600 text-[13px] font-semibold">Location</span>
            </div>
            <h2 className="font-serif font-semibold text-[32px] sm:text-[38px] leading-[1.15] text-neutral-950 mb-7">
              Come <span className="text-ink-500">visit</span> us
            </h2>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-ink-50 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-600" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-neutral-900">JE Academy</div>
                  <div className="text-[13px] text-neutral-600 mt-0.5">[Street address — pending confirmation]</div>
                  <div className="text-[13px] text-neutral-600">Karachi, Pakistan</div>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-ink-50 flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-600" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <a href="mailto:admissions@jeacademy.edu.pk" className="text-[13px] text-ink-600 no-underline hover:underline">
                  admissions@jeacademy.edu.pk
                </a>
              </div>
            </div>

            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[14px] font-semibold rounded-xl px-6 py-3.5 bg-ink-700 text-white no-underline hover:bg-ink-800 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Get directions
            </a>
          </div>

          {/* Map placeholder */}
          <div
            className="h-[300px] rounded-2xl border border-neutral-200 flex flex-col items-center justify-center text-neutral-500 text-[12.5px] gap-2.5"
            style={{
              background:
                'linear-gradient(var(--color-neutral-100) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, var(--color-neutral-100) 1px, transparent 1px) 0 0/24px 24px, var(--color-neutral-50)',
            }}
            aria-label="Map placeholder — coordinates pending"
          >
            <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-600" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span>Map embed — coordinates pending</span>
          </div>
        </div>
      </div>
    </section>
  )
}
