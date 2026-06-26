const ATTENDANCE: { day: string; present: boolean }[] = [
  { day: 'M', present: true },
  { day: 'T', present: true },
  { day: 'W', present: false },
  { day: 'T', present: true },
  { day: 'F', present: true },
]

const GRADES: { subj: string; score: number }[] = [
  { subj: 'Physics', score: 92 },
  { subj: 'Mathematics', score: 88 },
  { subj: 'Chemistry', score: 76 },
]

function PortalMockup() {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-neutral-200 shadow-2 bg-white">
      <div className="bg-ink-900 px-4 py-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-ink-600 flex items-center justify-center font-mono text-[10px] font-bold text-white shrink-0">
          AR
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-[12px] font-semibold">Ahmad Raza</div>
          <div className="text-ink-300 text-[9.5px]">Grade 9 · Roll #2024-09</div>
        </div>
        <div className="w-2 h-2 rounded-full bg-success shrink-0" />
      </div>

      <div className="px-4 pt-3 pb-2.5 border-b border-neutral-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-500 text-[9px] font-mono uppercase tracking-wider">Attendance</span>
          <span className="text-[9.5px] font-semibold" style={{ color: '#3D7157' }}>87%</span>
        </div>
        <div className="flex gap-1.5">
          {ATTENDANCE.map(({ day, present }, i) => (
            <div key={i} className="flex-1 text-center">
              <div
                className="h-6 rounded flex items-center justify-center text-[9px] font-bold"
                style={{
                  background: present ? 'rgba(61,113,87,0.12)' : 'rgba(151,63,53,0.12)',
                  color: present ? '#3D7157' : '#973F35',
                }}
              >
                {present ? '✓' : '✗'}
              </div>
              <div className="text-[8px] text-neutral-400 mt-0.5">{day}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 pb-2.5 border-b border-neutral-100">
        <div className="text-neutral-500 text-[9px] font-mono uppercase tracking-wider mb-2.5">Latest Results</div>
        <div className="space-y-2">
          {GRADES.map(({ subj, score }) => (
            <div key={subj} className="flex items-center gap-2">
              <span className="text-neutral-600 text-[9.5px] w-[76px] shrink-0">{subj}</span>
              <div className="flex-1 h-1.5 rounded-full bg-neutral-100">
                <div className="h-1.5 rounded-full bg-ink-500" style={{ width: `${score}%` }} />
              </div>
              <span className="text-neutral-900 text-[9.5px] font-mono w-6 text-right">{score}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(61,113,87,0.05)' }}>
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(61,113,87,0.15)' }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#3D7157" strokeWidth="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="text-neutral-600 text-[9.5px]">WhatsApp alert sent to parent</span>
      </div>
    </div>
  )
}

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-white"
      id="hero"
    >
      {/* Decorative floaters */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute -top-2 -left-4 text-ink-300" width="220" height="220" viewBox="0 0 220 220" fill="none">
          <path d="M30 200 Q10 110 80 45 Q140 -10 200 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <svg className="absolute top-8 left-24 text-ink-200" width="100" height="100" viewBox="0 0 100 100" fill="currentColor">
          {Array.from({ length: 36 }, (_, i) => (
            <circle key={i} cx={(i % 6) * 18 + 3} cy={Math.floor(i / 6) * 18 + 3} r="2.5" />
          ))}
        </svg>
        <svg className="absolute top-36 left-[43%] text-ink-300" width="38" height="38" viewBox="0 0 38 38" fill="none">
          <circle cx="19" cy="19" r="16" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        <svg className="absolute bottom-20 left-10 text-ink-400" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="14" y1="2" x2="14" y2="26" />
          <line x1="2" y1="14" x2="26" y2="14" />
          <line x1="5" y1="5" x2="23" y2="23" />
          <line x1="23" y1="5" x2="5" y2="23" />
        </svg>
        <svg className="absolute top-16 right-[14%] text-warning" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity="0.45">
          <path d="M8 0 L16 8 L8 16 L0 8 Z" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1fr_460px] gap-10 xl:gap-16 items-center">

          {/* Left: copy */}
          <div className="py-16 lg:py-24">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-5 h-5 rounded-md bg-ink-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-ink-600" />
              </div>
              <span className="text-ink-600 text-[13px] font-semibold">Admissions open · 2026–27</span>
            </div>

            <h1 className="font-serif font-semibold text-[50px] sm:text-[60px] lg:text-[52px] xl:text-[62px] leading-[1.06] text-neutral-950 mb-6">
              Where every<br />
              student is{' '}
              <span className="text-ink-500">known</span>
            </h1>

            <p className="text-[15.5px] text-neutral-600 leading-relaxed max-w-[480px] mb-9">
              A structured academy for Primary through Intermediate — real-time attendance, results,
              and progress shared directly with parents the moment they happen.
            </p>

            <div className="flex gap-3 flex-wrap mb-11">
              <a
                href="#enquiry"
                className="inline-flex items-center gap-2 text-[14px] font-semibold rounded-xl px-6 py-3.5 bg-ink-700 text-white no-underline hover:bg-ink-800 transition-colors shadow-sm"
              >
                Enquire about admission
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#programmes"
                className="inline-flex items-center text-[14px] font-semibold rounded-xl px-6 py-3.5 border border-neutral-300 bg-white/70 text-neutral-800 no-underline hover:bg-white hover:border-neutral-400 transition-colors"
              >
                View programmes
              </a>
            </div>

            <div className="flex items-center gap-8 pt-8 border-t border-neutral-200/80 flex-wrap">
              {[
                { value: '4', label: 'Academic programmes' },
                { value: '200+', label: 'Students enrolled' },
                { value: '5+', label: 'Years established' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-8">
                  <div>
                    <div className="font-serif text-[32px] font-semibold text-neutral-950 leading-none">{s.value}</div>
                    <div className="text-[12px] text-neutral-500 mt-1 font-medium">{s.label}</div>
                  </div>
                  {i < 2 && <div className="w-px h-10 bg-neutral-200 hidden sm:block" />}
                </div>
              ))}
            </div>
          </div>

          {/* Right: portal mockup */}
          <div className="hidden lg:flex items-center justify-center py-12">
            <div className="relative w-full max-w-[360px]">
              <PortalMockup />

              {/* Floating card — attendance alert */}
              <div className="absolute -left-14 top-10 bg-white rounded-2xl shadow-3 px-4 py-3 flex items-center gap-3 w-[210px] border border-neutral-100 z-10">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(61,113,87,0.1)' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3D7157" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div className="text-[11.5px] font-semibold text-neutral-900">Attendance marked</div>
                  <div className="text-[10.5px] text-neutral-500">WhatsApp alert sent</div>
                </div>
              </div>

              {/* Floating card — report grade */}
              <div className="absolute -right-10 -bottom-4 bg-white rounded-2xl shadow-3 px-5 py-3.5 border border-neutral-100 z-10">
                <div className="font-mono text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Progress report</div>
                <div className="font-serif text-[26px] font-semibold leading-none text-ink-700">A+</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">Half-yearly · Term 1</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
