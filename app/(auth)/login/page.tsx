import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import LoginMessages from './LoginMessages'
import { login } from './actions'

// No per-request data here (messages come from LoginMessages in the browser), so
// this page is prerendered and served from the edge instead of a function.
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Top bar — mirrors the public site's TopBar */}
      <div className="bg-ink-900 text-ink-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-2.5 flex justify-between items-center text-[12px]">
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
          <Link
            href="/"
            className="text-ink-400 hover:text-white transition-colors no-underline text-[12px]"
          >
            ← Back to site
          </Link>
        </div>
      </div>

      {/* Main — centred card */}
      <div className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-[420px]">

          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="bg-white border border-neutral-200 rounded-2xl p-3 shadow-1 mb-5">
              <Image
                src="/logos/je-academy-logo.png"
                width={56}
                height={56}
                alt="JE Academy"
                style={{ mixBlendMode: 'multiply' }}
                priority
              />
            </div>
            <h1 className="font-serif font-semibold text-[26px] text-neutral-950 text-center leading-tight">
              Sign in to JE Academy
            </h1>
            <p className="text-[13.5px] text-neutral-500 mt-2 text-center">
              Enter your credentials to access your portal.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-2 p-8">
            <form action={login} className="space-y-5">

              <Suspense fallback={null}>
                <LoginMessages />
              </Suspense>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-[12px] font-semibold text-neutral-700 mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@jeacademy.edu.pk"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] text-neutral-900 bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-[12px] font-semibold text-neutral-700"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[12px] font-medium text-ink-600 hover:text-ink-800 no-underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] text-neutral-900 bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl px-6 py-3.5 bg-ink-700 text-white hover:bg-ink-800 transition-colors mt-1"
              >
                Sign in
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-[12px] text-neutral-400 mt-6 leading-relaxed">
            Credentials are issued by your administrator.
            <br />
            There is no self-registration.
          </p>

          {/* Dev bypass — only shown when Supabase is not yet configured */}
          {!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https') && (
            <div className="mt-8 border border-dashed border-neutral-300 rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3 text-center">
                Dev mode — Supabase not configured
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Super Admin',  href: '/super-admin', color: '#233357' },
                  { label: 'Admissions',   href: '/admissions',  color: '#A26D53' },
                  { label: 'Attendance',   href: '/attendance',  color: '#487A63' },
                  { label: 'Marks',        href: '/marks',       color: '#7E587E' },
                  { label: 'Student',      href: '/student',     color: '#547B96' },
                  { label: 'Parent',       href: '/parent',      color: '#988671' },
                ].map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors no-underline"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                    <span className="text-[12px] font-medium text-neutral-700">{r.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page footer */}
      <div className="border-t border-neutral-100 py-4 text-center text-[11.5px] text-neutral-400">
        © {new Date().getFullYear()} JE Academy · Karachi, Pakistan
      </div>
    </div>
  )
}
