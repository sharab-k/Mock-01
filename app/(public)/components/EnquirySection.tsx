'use client'

import { useState, type FormEvent } from 'react'

const PROGRAMMES = ['Primary Years', 'Middle School', 'Matriculation', 'Intermediate']

const TRUST_POINTS = [
  'No commitment required — just a conversation',
  'Response within one working day via WhatsApp',
  'We cover Primary Years through Intermediate',
]

export default function EnquirySection() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    const data = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: data.get('student_name'),
          parent_phone: data.get('parent_phone'),
          program_interest: data.get('program_interest'),
          message: data.get('message'),
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="relative overflow-hidden bg-ink-900 py-20 sm:py-28" id="enquiry">
      {/* Decorative blobs */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full bg-ink-800/50" />
        <div className="absolute -bottom-28 -left-28 w-[440px] h-[440px] rounded-full bg-ink-800/40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">

          {/* Left: info */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-5 h-5 rounded-md bg-ink-700 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-ink-400" />
              </div>
              <span className="text-ink-400 text-[13px] font-semibold">Admissions</span>
            </div>
            <h2 className="font-serif font-semibold text-[36px] sm:text-[44px] leading-[1.1] text-white mb-5">
              Start an{' '}
              <span className="text-ink-400">admission</span>
              {' '}enquiry
            </h2>
            <p className="text-[15px] text-ink-300 leading-relaxed mb-10 max-w-[400px]">
              A member of the admissions team will respond by WhatsApp within one working day.
            </p>

            <div className="space-y-4">
              {TRUST_POINTS.map((text) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-ink-700 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-ink-300" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[13.5px] text-ink-300">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white rounded-2xl p-7 shadow-3">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D7157" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-neutral-900 m-0">Enquiry received</p>
                  <p className="text-[13px] text-neutral-600 mt-1.5 m-0">
                    We&rsquo;ll be in touch on WhatsApp within one working day.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
                      Student&rsquo;s name
                    </label>
                    <input
                      name="student_name"
                      required
                      placeholder="Full name"
                      className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] text-neutral-900 bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
                      WhatsApp / Phone
                    </label>
                    <input
                      name="parent_phone"
                      required
                      placeholder="03XX XXXXXXX"
                      className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] text-neutral-900 bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
                    Programme of interest
                  </label>
                  <select
                    name="program_interest"
                    required
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] text-neutral-900 bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
                  >
                    {PROGRAMMES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
                    Message{' '}
                    <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Any questions or additional context…"
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] text-neutral-900 bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl px-6 py-3.5 bg-ink-700 text-white hover:bg-ink-800 transition-colors disabled:opacity-60"
                >
                  {status === 'submitting' ? (
                    'Sending…'
                  ) : (
                    <>
                      Send enquiry
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                {status === 'error' && (
                  <p className="text-[12.5px] text-danger text-center m-0">
                    Something went wrong — please try again.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
