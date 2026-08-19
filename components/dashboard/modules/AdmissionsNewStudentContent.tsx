'use client'

import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, KeyRound, Copy, Check, UserPlus, AlertCircle, Users } from 'lucide-react'
import { PROGRAMS, PROGRAM_GRADE, sectionsForGrade, type Program } from '@/lib/students/constants'
import { enrolStudentAction, type EnrolStudentResult } from '@/lib/actions/enrol-student'

const STREAMS = ['Pre-Engineering', 'Pre-Medical', 'Computer Science', 'Commerce'] as const

type Props = {
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical enrolment flow within its own shell. */
  basePath?: string
}

export default function AdmissionsNewStudentContent({ basePath = '/admissions' }: Props) {
  const [studentName, setStudentName] = useState('')
  // Programme IS the grade choice (SSC-1/2 = grade 9/10, HSC-1/2 = grade 11/12)
  // — no separate grade picker.
  const [program, setProgram] = useState<Program>(PROGRAMS[0])
  const grade = PROGRAM_GRADE[program]
  const [section, setSection] = useState(sectionsForGrade(grade)[0])
  const [isLate, setIsLate] = useState(false)
  const [stream, setStream] = useState<typeof STREAMS[number] | ''>('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentSecondaryPhone, setParentSecondaryPhone] = useState('')
  const [parentWhatsapp2, setParentWhatsapp2] = useState('')
  const [guardianProfession, setGuardianProfession] = useState('')
  const [address, setAddress] = useState('')
  const [previousSchool, setPreviousSchool] = useState('')
  const [lastQualification, setLastQualification] = useState('')
  const [grNumber, setGrNumber] = useState('')
  const [registrationFee, setRegistrationFee] = useState('')
  const [tuitionFee, setTuitionFee] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<Extract<EnrolStudentResult, { ok: true }> | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Section options depend on grade (9-10 are Boys/Girls, 11-12 are A-D) —
  // reset to the first valid option whenever grade changes.
  useEffect(() => {
    const valid = sectionsForGrade(grade)
    if (!valid.includes(section)) setSection(valid[0])
  }, [grade, section])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError('')

    const outcome = await enrolStudentAction({
      studentName,
      grade,
      section,
      program,
      isLate,
      parentName,
      parentPhone,
      parentSecondaryPhone: parentSecondaryPhone || undefined,
      parentWhatsapp2: parentWhatsapp2 || undefined,
      guardianProfession: guardianProfession || undefined,
      address: address || undefined,
      previousSchool: previousSchool || undefined,
      lastQualification: lastQualification || undefined,
      grNumber,
      registrationFee: registrationFee ? Number(registrationFee) : undefined,
      tuitionFee: tuitionFee ? Number(tuitionFee) : undefined,
      stream: stream || undefined,
    })

    if (!outcome.ok) {
      setError(outcome.error)
      setStatus('error')
      return
    }

    setResult(outcome)
    setStatus('success')
  }

  const copyCredentials = async () => {
    if (!result) return
    const text = result.parentAccountType === 'new'
      ? `Roll: ${result.rollNumber}\nRegistration: ${result.registrationNumber}\nUsername: ${result.username}\nTemporary password: ${result.tempPassword}`
      : `Roll: ${result.rollNumber}\nRegistration: ${result.registrationNumber}\nLinked to existing parent account: ${result.username}`
    try {
      await navigator.clipboard.writeText(text)
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
        {status === 'success' && result ? (
          <div className="flex flex-col items-center text-center gap-5 py-4">
            <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center">
              <CheckCircle2 size={26} className="text-success" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-neutral-900">{studentName} enrolled</p>
              <p className="text-[13px] text-neutral-500 mt-1">Grade {grade}-{section} · {program}{isLate ? ' · Late enrollment (watch-time tracking enabled)' : ''}</p>
            </div>

            {result.parentAccountType === 'new' ? (
              <div className="w-full bg-ink-50 border border-ink-100 rounded-2xl p-5 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound size={14} className="text-ink-600" />
                  <p className="text-[12.5px] font-semibold text-ink-700">Parent credentials — auto-issued</p>
                </div>
                <div className="space-y-2 font-mono text-[12.5px] text-neutral-800">
                  <div className="flex justify-between"><span className="text-neutral-400">Roll number</span><span>{result.rollNumber}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Registration number</span><span>{result.registrationNumber}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Username</span><span>{result.username}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Temp password</span><span>{result.tempPassword}</span></div>
                </div>
                <button onClick={copyCredentials} className="mt-4 w-full flex items-center justify-center gap-2 text-[12.5px] font-semibold text-ink-700 bg-white border border-ink-200 py-2.5 rounded-xl hover:bg-ink-100/50 transition-colors">
                  {copied ? <><Check size={13} className="text-success" /> Copied</> : <><Copy size={13} /> Copy credentials</>}
                </button>
              </div>
            ) : (
              <div className="w-full bg-warning-bg border border-warning/20 rounded-2xl p-5 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-warning" />
                  <p className="text-[12.5px] font-semibold text-warning">Linked to an existing parent account</p>
                </div>
                <p className="text-[12.5px] text-neutral-700 leading-relaxed mb-3">
                  This phone number already has a parent account — {studentName} was added as a sibling under it. No new credentials were issued; the existing login still works.
                </p>
                <div className="space-y-2 font-mono text-[12.5px] text-neutral-800 pt-3 border-t border-warning/20">
                  <div className="flex justify-between"><span className="text-neutral-400">Roll number</span><span>{result.rollNumber}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Registration number</span><span>{result.registrationNumber}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Parent username</span><span>{result.username}</span></div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 w-full pt-1">
              <Link href={`${basePath}/students`} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors no-underline text-center">View Directory</Link>
              <button
                onClick={() => {
                  setStatus('idle'); setResult(null); setStudentName(''); setParentName(''); setParentPhone(''); setIsLate(false)
                  setStream(''); setGuardianProfession(''); setAddress(''); setPreviousSchool(''); setLastQualification('')
                  setGrNumber(''); setRegistrationFee(''); setTuitionFee('')
                }}
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

            {status === 'error' && (
              <div className="flex items-start gap-2.5 bg-danger-bg border border-danger/20 rounded-xl p-3.5">
                <AlertCircle size={14} className="text-danger mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-danger leading-relaxed">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Student full name</label>
                <input required value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Zoya Ahmed" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">G.R. No.</label>
                <input required value={grNumber} onChange={(e) => setGrNumber(e.target.value)} placeholder="e.g. 4821" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Programme</label>
                <select value={program} onChange={(e) => setProgram(e.target.value as Program)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                  {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Section</label>
                <select value={section} onChange={(e) => setSection(e.target.value as typeof section)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                  {sectionsForGrade(grade).map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3.5 bg-warning-bg/50 border border-warning/20 rounded-xl cursor-pointer select-none">
              <input type="checkbox" checked={isLate} onChange={(e) => setIsLate(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-warning focus:ring-warning/30" />
              <span className="text-[12.5px] text-warning leading-relaxed">
                <strong>Late enrollment</strong> — enables strict video watch-time tracking for lecture catch-up (only applies to students joining after term start).
              </span>
            </label>

            {(grade === '11' || grade === '12') && (
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Stream <span className="text-neutral-400 font-normal">(Intermediate)</span></label>
                <select value={stream} onChange={(e) => setStream(e.target.value as typeof stream)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                  <option value="">Not selected</option>
                  {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
              <p className="text-[12.5px] font-semibold text-neutral-400 uppercase tracking-wider">Academic Background <span className="text-neutral-400 font-normal normal-case">(optional)</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">School / college</label>
                <input value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)} placeholder="e.g. City Public School" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Last qualification</label>
                <input value={lastQualification} onChange={(e) => setLastQualification(e.target.value)} placeholder="e.g. Grade 8 · Distinction" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
              <p className="text-[12.5px] font-semibold text-neutral-400 uppercase tracking-wider">Parent / Guardian</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Parent&apos;s name</label>
                <input required value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Mr. Ahmed Raza" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">WhatsApp No.</label>
                <input required value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="03XX XXXXXXX" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Phone No. <span className="text-neutral-400 font-normal">(optional)</span></label>
                <input value={parentSecondaryPhone} onChange={(e) => setParentSecondaryPhone(e.target.value)} placeholder="03XX XXXXXXX" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">WhatsApp 2 <span className="text-neutral-400 font-normal">(optional)</span></label>
                <input value={parentWhatsapp2} onChange={(e) => setParentWhatsapp2(e.target.value)} placeholder="03XX XXXXXXX" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Profession <span className="text-neutral-400 font-normal">(optional)</span></label>
                <input value={guardianProfession} onChange={(e) => setGuardianProfession(e.target.value)} placeholder="e.g. Engineer" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Address <span className="text-neutral-400 font-normal">(optional)</span></label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / street / area" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
              <p className="text-[12.5px] font-semibold text-neutral-400 uppercase tracking-wider">Office Use <span className="text-neutral-400 font-normal normal-case">(optional)</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Registration fee</label>
                <input type="number" min="0" value={registrationFee} onChange={(e) => setRegistrationFee(e.target.value)} placeholder="PKR" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Tuition fee</label>
                <input type="number" min="0" value={tuitionFee} onChange={(e) => setTuitionFee(e.target.value)} placeholder="PKR" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
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
