export default function TopBar() {
  return (
    <div className="bg-ink-900 text-ink-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-2.5 flex justify-between items-center gap-4 text-[12px]">
        <div className="flex items-center gap-5">
          <a
            href="mailto:admissions@jeacademy.edu.pk"
            className="flex items-center gap-1.5 text-ink-200 no-underline hover:text-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            admissions@jeacademy.edu.pk
          </a>
          <a
            href="tel:+9221XXXXXXXX"
            className="hidden sm:flex items-center gap-1.5 text-ink-200 no-underline hover:text-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" />
            </svg>
            +92 21 XXX XXXX
          </a>
        </div>
        <div className="flex items-center gap-3">
          <a href="#" aria-label="Facebook" className="text-ink-400 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
          <a href="#" aria-label="Instagram" className="text-ink-400 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r=".5" fill="currentColor" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
