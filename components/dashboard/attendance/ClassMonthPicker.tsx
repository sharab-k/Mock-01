'use client'

import { useState } from 'react'
import { GRADES, sectionsForGrade, type Grade } from '@/lib/students/constants'

const INPUT = 'w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10'
const LABEL = 'block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5'

// Class, section and month for the monthly attendance report. The section list follows the class, so a
// section that does not exist for it (G1 in a co-ed class) can never be chosen. Plain GET form, no client fetch.
export default function ClassMonthPicker({ grade: g0, section: s0, month: m0, maxMonth }: { grade: string; section: string; month: string; maxMonth: string }) {
  const [grade, setGrade] = useState<Grade>(GRADES.includes(g0 as Grade) ? (g0 as Grade) : GRADES[0]!)
  const sections = sectionsForGrade(grade)
  const [section, setSection] = useState(sections.includes(s0 as never) ? s0 : sections[0]!)

  return (
    <form method="get" className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
      <div>
        <label className={LABEL} htmlFor="mr-grade">Class</label>
        <select id="mr-grade" name="grade" className={INPUT} value={grade} onChange={(e) => { const next = e.target.value as Grade; setGrade(next); setSection(sectionsForGrade(next)[0]!) }}>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL} htmlFor="mr-section">Section / group</label>
        <select id="mr-section" name="section" className={INPUT} value={section} onChange={(e) => setSection(e.target.value)}>
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL} htmlFor="mr-month">Month</label>
        <input id="mr-month" name="month" type="month" defaultValue={m0} max={maxMonth} className={`${INPUT} font-mono`} required />
      </div>
      <button type="submit" className="inline-flex justify-center items-center text-[12.5px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-2.5 rounded-xl">Show report</button>
    </form>
  )
}
