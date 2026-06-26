type Notice = {
  day: string
  month: string
  category: string
  title: string
  desc: string
}

const NOTICES: Notice[] = [
  {
    day: '12',
    month: 'Aug',
    category: 'Parent–Teacher',
    title: 'Mid-Term Parent-Teacher Meeting',
    desc: 'An opportunity for parents to meet subject teachers and discuss mid-term academic progress.',
  },
  {
    day: '28',
    month: 'Aug',
    category: 'Examinations',
    title: 'Half-Yearly Examination Schedule Released',
    desc: 'The full timetable for the half-yearly examinations is now available for all programmes.',
  },
  {
    day: '05',
    month: 'Sep',
    category: 'Admissions',
    title: 'Annual Admissions Open Day',
    desc: 'Prospective families are invited to tour the campus and meet the admissions team.',
  },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Parent–Teacher': { bg: 'rgba(73,95,141,0.1)', text: '#495F8D' },
  'Examinations': { bg: 'rgba(169,124,45,0.1)', text: '#A97C2D' },
  'Admissions': { bg: 'rgba(61,113,87,0.1)', text: '#3D7157' },
}

export default function NoticesSection() {
  return (
    <section className="bg-white py-20 sm:py-28" id="notices">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-md bg-ink-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-ink-600" />
              </div>
              <span className="text-ink-600 text-[13px] font-semibold">Notices</span>
            </div>
            <h2 className="font-serif font-semibold text-[32px] sm:text-[38px] leading-[1.15] text-neutral-950">
              Latest{' '}
              <span className="text-ink-500">events</span>
              {' '}&amp; notices
            </h2>
          </div>
          <a
            href="/login"
            className="shrink-0 inline-flex items-center gap-1.5 text-[13px] text-ink-600 font-semibold no-underline hover:text-ink-800 transition-colors"
          >
            View all notices (login)
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Notice cards — EduFit event-card style, split 2-col */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {NOTICES.map((n) => {
            const colors = CATEGORY_COLORS[n.category] ?? { bg: 'rgba(73,95,141,0.1)', text: '#495F8D' }
            return (
              <div
                key={n.title}
                className="group rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden hover:bg-white hover:shadow-2 hover:border-neutral-300 transition-all cursor-pointer"
              >
                {/* Date banner */}
                <div className="px-6 pt-5 pb-4 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{ background: colors.bg }}
                  >
                    <span className="font-serif text-[22px] font-semibold leading-none" style={{ color: colors.text }}>{n.day}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: colors.text }}>{n.month}</span>
                  </div>
                  <div>
                    <span
                      className="inline-flex text-[10.5px] px-2.5 py-0.5 rounded-full font-semibold mb-1.5"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {n.category}
                    </span>
                    <h4 className="text-[14px] font-semibold text-neutral-950 leading-snug m-0">{n.title}</h4>
                  </div>
                </div>

                <div className="px-6 pb-5 border-t border-neutral-100">
                  <p className="text-[13px] text-neutral-600 leading-relaxed mt-3 mb-4">{n.desc}</p>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-600 group-hover:text-ink-800 transition-colors">
                    View details
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
