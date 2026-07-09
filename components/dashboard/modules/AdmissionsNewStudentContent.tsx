'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, KeyRound, Copy, Check, UserPlus } from 'lucide-react'
import { GRADES, SECTIONS } from '@/lib/mock/students'

const PROGRAMS = ['Primary Years', 'Middle School', 'Matriculation', 'Intermediate']

function genCredential(name: string) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '.')
  const roll = `JE-2026-${Math.floor(100 + Math.random() * 800)}`
  return { username: `${slug}.parent@jeacademy.edu.pk`, roll, tempPassword: `Je${Math.floor(1000 + Math.random() * 9000)}!` }
}

type Props = {
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical enrolment flow within its own shell. */
  basePath?: string
}

export default function AdmissionsNewStudentContent({ basePath = '/admissions' }: Props) {
  const [studentName, setStudentName] = useState('')
  const [grade, setGrade] = useState(GRADES[0])
  const [section, setSection] = useState(SECTIONS[0])
  const [program, setProgram] = useState(PROGRAMS[2])
  const [isLate, setIsLate] = useState(false)
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [credential, setCredential] = useState<{ username: string; roll: string; tempPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    // TODO: replace with a Supabase insert into `students` + auto-provisioned `profiles` row for the parent
    setTimeout(() => {
      setCredential(genCredential(parentName))
      setStatus('success')
    }, 900)
  }

  const copyCredentials = async () => {
    if (!credential) return
    try {
      await navigator.clipboard.writeText(`Roll: ${credential.roll}\nUsername: ${credential.username}\nTemporary password: ${credential.tempPassword}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked */ }
  }

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Admissions
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Enrol Student</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Parent login credentials are generated and issued automatically on enrolment</p>
      </div>

      <div className="max-w-xl bg-white rounded-2xl border border-neutral-200 shadow-1 p-7">
        {status === 'success' && credential ? (
          <div className="flex flex-col items-center text-center gap-5 py-4">
            <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center">
              <CheckCircle2 size={26} className="text-success" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-neutral-900">{studentName} enrolled</p>
              <p className="text-[13px] text-neutral-500 mt-1">Grade {grade}-{section} · {program}{isLate ? ' · Late enrollment (watch-time tracking enabled)' : ''}</p>
            </div>

            <div className="w-full bg-ink-50 border border-ink-100 rounded-2xl p-5 text-left">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={14} className="text-ink-600" />
                <p className="text-[12.5px] font-semibold text-ink-700">Parent credentials — auto-issued</p>
              </div>
              <div className="space-y-2 font-mono text-[12.5px] text-neutral-800">
                <div className="flex justify-between"><span className="text-neutral-400">Roll number</span><span>{credential.roll}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Username</span><span>{credential.username}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Temp password</span><span>{credential.tempPassword}</span></div>
              </div>
              <button onClick={copyCredentials} className="mt-4 w-full flex items-center justify-center gap-2 text-[12.5px] font-semibold text-ink-700 bg-white border border-ink-200 py-2.5 rounded-xl hover:bg-ink-100/50 transition-colors">
                {copied ? <><Check size={13} className="text-success" /> Copied</> : <><Copy size={13} /> Copy credentials</>}
              </button>
            </div>

            <div className="flex items-center gap-3 w-full pt-1">
              <Link href={`${basePath}/students`} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors no-underline text-center">View Directory</Link>
              <button
                onClick={() => { setStatus('idle'); setCredential(null); setStudentName(''); setParentName(''); setParentPhone(''); setIsLate(false) }}
                className="flex-1 py-3 text-[13px] font-semibold rounded-xl bg-ink-700 text-white hover:bg-ink-800 transition-colors"
              >
                Enrol Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                <UserPlus size={18} className="text-ink-600" />
              </div>
              <p className="text-[12.5px] font-semibold text-neutral-400 uppercase tracking-wider">Student Information</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Student full name</label>
              <input required value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Zoya Ahmed" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Grade</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value as typeof grade)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                  {GRADES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Section</label>
                <select value={section} onChange={(e) => setSection(e.target.value as typeof section)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                  {SECTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Programme</label>
                <select value={program} onChange={(e) => setProgram(e.target.value)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                  {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3.5 bg-warning-bg/50 border border-warning/20 rounded-xl cursor-pointer select-none">
              <input type="checkbox" checked={isLate} onChange={(e) => setIsLate(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-warning focus:ring-warning/30" />
              <span className="text-[12.5px] text-warning leading-relaxed">
                <strong>Late enrollment</strong> — enables strict video watch-time tracking for lecture catch-up (only applies to students joining after term start).
              </span>
            </label>

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
              <p className="text-[12.5px] font-semibold text-neutral-400 uppercase tracking-wider">Parent / Guardian</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Parent&apos;s name</label>
                <input required value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Mr. Ahmed Raza" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">WhatsApp / Phone</label>
                <input required value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="03XX XXXXXXX" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
            </div>

            <button type="submit" disabled={status === 'submitting'} className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl px-6 py-3.5 bg-ink-700 text-white hover:bg-ink-800 transition-colors disabled:opacity-60 mt-2">
              {status === 'submitting' ? 'Enrolling…' : 'Enrol Student & Issue Parent Login'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
