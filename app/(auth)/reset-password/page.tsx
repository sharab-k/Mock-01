import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updatePassword } from './actions'

type Props = {
  searchParams: Promise<{ error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  weak_password: 'Password must be at least 8 characters.',
  password_mismatch: 'Passwords do not match. Please try again.',
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.') : null

  // Requires the recovery session set by app/auth/callback/route.ts — if
  // someone lands here without going through the email link, send them back
  // rather than showing a form that can only ever fail on submit.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=reset_link_invalid')

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
              Set a new password
            </h1>
            <p className="text-[13.5px] text-neutral-500 mt-2 text-center">
              Choose a new password for your account.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-2 p-8">
            <form action={updatePassword} className="space-y-5">

              {/* Error banner */}
              {errorMessage && (
                <div className="flex items-start gap-3 bg-danger-bg border border-danger/20 rounded-xl px-4 py-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger shrink-0 mt-0.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-[13px] text-danger leading-snug">{errorMessage}</p>
                </div>
              )}

              {/* New password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[12px] font-semibold text-neutral-700 mb-1.5"
                >
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] text-neutral-900 bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
                />
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[12px] font-semibold text-neutral-700 mb-1.5"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] text-neutral-900 bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl px-6 py-3.5 bg-ink-700 text-white hover:bg-ink-800 transition-colors mt-1"
              >
                Update password
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Page footer */}
      <div className="border-t border-neutral-100 py-4 text-center text-[11.5px] text-neutral-400">
        © {new Date().getFullYear()} JE Academy · Karachi, Pakistan
      </div>
    </div>
  )
}
