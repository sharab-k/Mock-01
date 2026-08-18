import Image from 'next/image'
import Link from 'next/link'
import { requestPasswordReset } from './actions'

type Props = {
  searchParams: Promise<{ sent?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { sent } = await searchParams

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
              Reset your password
            </h1>
            <p className="text-[13.5px] text-neutral-500 mt-2 text-center">
              {sent === '1'
                ? 'Check your email for a reset link.'
                : 'Enter your account email and we’ll send you a reset link.'}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-2 p-8">
            {sent === '1' ? (
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <p className="text-[13px] text-neutral-600 leading-relaxed">
                  If an account exists for that email, a password reset link is on its way. It may take a few minutes to arrive — check your spam folder too.
                </p>
                <Link
                  href="/login"
                  className="mt-2 text-[13px] font-semibold text-ink-600 hover:text-ink-800 no-underline transition-colors"
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form action={requestPasswordReset} className="space-y-5">
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

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl px-6 py-3.5 bg-ink-700 text-white hover:bg-ink-800 transition-colors mt-1"
                >
                  Send reset link
                </button>

                <Link
                  href="/login"
                  className="block text-center text-[12.5px] font-medium text-ink-600 hover:text-ink-800 no-underline transition-colors"
                >
                  ← Back to sign in
                </Link>
              </form>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-[12px] text-neutral-400 mt-6 leading-relaxed">
            Only staff and admin accounts can reset via email.
            <br />
            Parents — contact your admissions office for help signing in.
          </p>
        </div>
      </div>

      {/* Page footer */}
      <div className="border-t border-neutral-100 py-4 text-center text-[11.5px] text-neutral-400">
        © {new Date().getFullYear()} JE Academy · Karachi, Pakistan
      </div>
    </div>
  )
}
