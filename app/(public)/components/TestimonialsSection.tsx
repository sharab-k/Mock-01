type Testimonial = {
  initials: string
  name: string
  role: string
  quote: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    initials: 'FH',
    name: 'F. Hassan',
    role: 'Parent of a Grade 7 student',
    quote:
      "I get a WhatsApp message the moment my son's attendance is marked. No more calling the office to ask.",
  },
  {
    initials: 'RI',
    name: 'R. Iqbal',
    role: 'Parent of two children at JE Academy',
    quote: "One login for both my kids' report cards. Such a small thing, but it changes everything.",
  },
  {
    initials: 'MT',
    name: 'M. Tariq',
    role: 'Parent of a Matriculation student',
    quote:
      'Downloaded the full half-yearly report in one click before the parent meeting. Saved me an afternoon.',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="bg-white py-20 sm:py-28" id="testimonials">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* Header — centred like EduFit */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-md bg-ink-100 flex items-center justify-center">
              <div className="w-2 h-2 rounded-sm bg-ink-600" />
            </div>
            <span className="text-ink-600 text-[13px] font-semibold">Testimonials</span>
          </div>
          <h2 className="font-serif font-semibold text-[32px] sm:text-[38px] leading-[1.15] text-neutral-950">
            What our{' '}
            <span className="text-ink-500">parents</span>
            {' '}say
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.initials}
              className="bg-white rounded-2xl border border-neutral-200 p-7 hover:shadow-2 hover:border-neutral-300 transition-all flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#A38343" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>

              {/* Opening quote mark */}
              <svg className="text-ink-100 mb-3" width="32" height="24" viewBox="0 0 40 30" fill="currentColor" aria-hidden="true">
                <path d="M0 30V18C0 13.2 1.3 9.05 3.9 5.55C6.6 1.95 10.35 0 15.15 0L16.8 2.7C14.1 3.6 11.85 5.3 10.05 7.8C8.25 10.2 7.35 12.9 7.35 15.9H13.5V30H0ZM23.7 30V18C23.7 13.2 24.95 9.05 27.45 5.55C30.05 1.95 33.8 0 38.6 0L40.2 2.7C37.5 3.6 35.25 5.3 33.45 7.8C31.65 10.2 30.75 12.9 30.75 15.9H36.9V30H23.7Z" />
              </svg>

              <p className="text-[14px] text-neutral-700 leading-relaxed flex-1 mb-6">{t.quote}</p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-neutral-100">
                <div className="w-9 h-9 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[11px] font-semibold shrink-0">
                  {t.initials}
                </div>
                <div>
                  <span className="block text-[13px] font-semibold text-neutral-900">{t.name}</span>
                  <span className="block text-[11px] text-neutral-500">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
