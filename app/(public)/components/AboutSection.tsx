import Image from 'next/image'

export default function AboutSection() {
  return (
    <section className="bg-white py-20 sm:py-28" id="about">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* Photo collage */}
          <div className="relative grid grid-cols-2 gap-4 h-[420px]">
            {/* Dot grid decoration */}
            <svg
              aria-hidden="true"
              className="absolute -top-4 -left-4 text-ink-100"
              width="90"
              height="90"
              viewBox="0 0 90 90"
              fill="currentColor"
            >
              {Array.from({ length: 25 }, (_, i) => (
                <circle key={i} cx={(i % 5) * 18 + 3} cy={Math.floor(i / 5) * 18 + 3} r="2.5" />
              ))}
            </svg>

            {/* Left panel — engaged classroom */}
            <div className="relative rounded-2xl overflow-hidden -translate-y-6 shadow-2">
              <Image
                src="/images/classroom-engaged.jpg"
                alt="Students engaged in class, hands raised"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 40vw, 20vw"
              />
            </div>

            {/* Right panel — teacher helping student */}
            <div className="relative rounded-2xl overflow-hidden translate-y-6 shadow-2">
              <Image
                src="/images/classroom-middle.jpg"
                alt="Teacher helping a student at their desk"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 40vw, 20vw"
              />
            </div>

            {/* Floating stat chip */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-ink-700 text-white rounded-2xl px-5 py-3.5 shadow-3 whitespace-nowrap text-center z-10">
              <div className="font-serif text-[24px] font-semibold leading-none">2.5K+</div>
              <div className="text-[10.5px] text-ink-200 mt-1">Parent notifications sent</div>
            </div>
          </div>

          {/* Text column */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-5 h-5 rounded-md bg-ink-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-ink-600" />
              </div>
              <span className="text-ink-600 text-[13px] font-semibold">About JE Academy</span>
            </div>

            <h2 className="font-serif font-semibold text-[32px] sm:text-[38px] leading-[1.15] text-neutral-950 mb-5">
              Welcome to our{' '}
              <span className="text-ink-500">learning</span>
              {' '}community
            </h2>

            <p className="text-[15px] text-neutral-600 leading-relaxed mb-7">
              Every attendance mark, every grade, every notice reaches parents the moment it&apos;s
              entered — so the relationship between home and classroom never depends on a phone call.
            </p>

            <div className="space-y-4 mb-8">
              {[
                'Real-time WhatsApp & SMS alerts for attendance and grades',
                'One parent login covers all siblings under a single account',
                'Downloadable PDF progress reports — generated on demand',
              ].map((text) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-ink-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-ink-600" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[13.5px] text-neutral-700">{text}</span>
                </div>
              ))}
            </div>

            {/* Principal quote card */}
            <div className="flex items-start gap-3 bg-neutral-50 rounded-2xl border border-neutral-200 p-5">
              <div className="w-10 h-10 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[12px] font-semibold shrink-0">
                JE
              </div>
              <div>
                <p className="text-[13px] text-neutral-600 italic leading-relaxed m-0">
                  &ldquo;[Principal&rsquo;s welcome note — pending copy from JE Academy]&rdquo;
                </p>
                <span className="block text-[11px] text-neutral-400 mt-1.5 font-medium">
                  Principal, JE Academy
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
