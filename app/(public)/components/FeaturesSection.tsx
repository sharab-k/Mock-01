import type { ReactNode } from 'react'

type Feature = {
  title: string
  description: string
  icon: ReactNode
  iconBg: string
  iconColor: string
}

const FEATURES: Feature[] = [
  {
    title: 'Instant attendance alerts',
    description:
      "Parents hear about an absence by WhatsApp or SMS the moment it's recorded — not at the end of the week.",
    iconBg: 'rgba(61,113,87,0.1)',
    iconColor: '#3D7157',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 20l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    title: 'One login, every sibling',
    description:
      'Parents with more than one child at JE Academy track all of them from a single account with a single password.',
    iconBg: 'rgba(73,95,141,0.1)',
    iconColor: '#495F8D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Verified lecture watch-time',
    description:
      'For late enrolments, real engagement with video lectures is tracked — not just opened and closed.',
    iconBg: 'rgba(126,88,126,0.1)',
    iconColor: '#7E587E',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <polygon points="10 8 16 12 10 16 10 8" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    title: 'Downloadable progress reports',
    description:
      "Monthly tests, half-yearly and final results — exportable as one PDF report, whenever it's needed.",
    iconBg: 'rgba(169,124,45,0.1)',
    iconColor: '#A97C2D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

export default function FeaturesSection() {
  return (
    <section className="bg-white py-20 sm:py-28" id="features">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-md bg-ink-100 flex items-center justify-center">
              <div className="w-2 h-2 rounded-sm bg-ink-600" />
            </div>
            <span className="text-ink-600 text-[13px] font-semibold">Why JE Academy</span>
          </div>
          <h2 className="font-serif font-semibold text-[32px] sm:text-[38px] leading-[1.15] text-neutral-950">
            Why trust us with your{' '}
            <span className="text-ink-500">child&apos;s</span>
            {' '}education
          </h2>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-7 hover:bg-white hover:shadow-2 hover:border-neutral-300 transition-all"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: f.iconBg, color: f.iconColor }}
              >
                {f.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-neutral-950 mb-3">{f.title}</h3>
              <p className="text-[13px] text-neutral-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
