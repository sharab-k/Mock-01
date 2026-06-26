import Image from 'next/image'

const QUICK_LINKS = ['About', 'Programmes', 'Faculty', 'Notices']
const PORTAL_LINKS = ['Parent login', 'Student login', 'Staff login']

export default function Footer() {
  return (
    <footer className="bg-neutral-950 text-neutral-400">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.6fr] gap-10 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {/* White-bg badge so the mark reads on dark footer */}
              <div className="bg-white rounded-xl p-1.5 shrink-0 flex items-center justify-center">
                <Image
                  src="/logos/je-academy-logo.png"
                  width={34}
                  height={34}
                  alt="JE Academy crest"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </div>
              <span className="font-serif text-[17px] font-semibold text-white">JE Academy</span>
            </div>
            <p className="text-[13px] text-neutral-400 max-w-[240px] leading-relaxed mb-4">
              Real-time attendance, results and notices — for every family, every sibling, one login.
            </p>
            <div className="text-[12px] text-neutral-500 mb-5">
              [Address pending], Karachi, Pakistan<br />
              <a href="mailto:admissions@jeacademy.edu.pk" className="hover:text-neutral-300 transition-colors no-underline">
                admissions@jeacademy.edu.pk
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <a
                href="#"
                aria-label="Facebook"
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-ink-700 flex items-center justify-center transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-300" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-ink-700 flex items-center justify-center transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-300" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="17.5" cy="6.5" r=".5" fill="currentColor" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="WhatsApp"
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-ink-700 flex items-center justify-center transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-300" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M11.988 2C6.474 2 2 6.474 2 11.988c0 1.944.558 3.756 1.515 5.291L2 22l4.833-1.493A9.933 9.933 0 0 0 11.988 22C17.502 22 22 17.526 22 12.012 22 6.498 17.502 2 11.988 2zm0 18.15a8.115 8.115 0 0 1-4.14-1.133l-.296-.176-3.073.948.982-3.003-.194-.31a8.116 8.116 0 0 1-1.274-4.288c0-4.48 3.648-8.128 8.132-8.128 4.482 0 8.13 3.648 8.13 8.128 0 4.483-3.648 8.13-8.13 8.13l-.137-.168z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h5 className="text-[11px] uppercase tracking-[0.08em] text-neutral-200 mb-4 font-semibold">
              Quick links
            </h5>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {QUICK_LINKS.map((l) => (
                <li key={l}>
                  <a
                    href={`#${l.toLowerCase()}`}
                    className="text-[13px] text-neutral-400 no-underline hover:text-neutral-200 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h5 className="text-[11px] uppercase tracking-[0.08em] text-neutral-200 mb-4 font-semibold">
              Portals
            </h5>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {PORTAL_LINKS.map((l) => (
                <li key={l}>
                  <a
                    href="/login"
                    className="text-[13px] text-neutral-400 no-underline hover:text-neutral-200 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter subscribe — matches EduFit 4th column */}
          <div>
            <h5 className="text-[11px] uppercase tracking-[0.08em] text-neutral-200 mb-4 font-semibold">
              Stay Updated
            </h5>
            <p className="text-[13px] text-neutral-500 leading-relaxed mb-4">
              Subscribe to receive notices, exam schedules and academy announcements.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="flex-1 px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-[13px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-ink-500 transition-colors"
              />
              <button
                type="button"
                className="px-4 py-2.5 bg-ink-700 hover:bg-ink-600 text-white rounded-xl text-[13px] font-semibold transition-colors shrink-0"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-6 text-[12px] flex justify-between flex-wrap gap-2">
          <span>© 2026 JE Academy. All rights reserved.</span>
          <span className="text-neutral-600">Karachi, Pakistan</span>
        </div>
      </div>
    </footer>
  )
}
