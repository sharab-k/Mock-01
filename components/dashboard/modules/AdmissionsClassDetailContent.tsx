'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import {
  ArrowLeft, Users, KeyRound, FileText, UserPlus,
  Pencil, Trash2, CheckCircle2, X,
} from 'lucide-react'
import { updateStudentAction, deleteStudentAction } from '@/lib/actions/students'
import { updateParentContactAction } from '@/lib/actions/parents'
import { GRADES, sectionsForGrade, PROGRAM_GRADE, PROGRAMS, type Grade, type Section, type Program } from '@/lib/students/constants'

const STREAMS = ['Pre-Engineering', 'Pre-Medical', 'Computer Science', 'Commerce'] as const

export type ClassDetailStudent = {
  id: string
  name: string
  roll: string
  grade: string
  section: string
  program: string
  isLate: boolean
  stream: string | null
  guardianProfession: string | null
  previousSchool: string | null
  lastQualification: string | null
  address: string | null
  grNumber: string | null
  registrationFee: number | null
  tuitionFee: number | null
  parentId: string | null
  parentName: string | null
  parentPhone: string | null
  parentSecondaryPhone: string | null
  parentWhatsapp2: string | null
  credentialSent: boolean
  pdfReady: boolean
  date: string
}

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

type Props = {
  grade: string
  section: string
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical class-detail view within its own shell. */
  basePath?: string
  students: ClassDetailStudent[]
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdmissionsClassDetailContent({ grade, section, basePath = '/admissions', students: initialStudents }: Props) {
  // Server-side re-checks the caller's actual role regardless — this only
  // decides whether to show Roll No./G.R. No. as editable in the UI.
  const isSuperAdmin = basePath.startsWith('/super-admin')
  const [students,      setStudents]      = useState<ClassDetailStudent[]>(initialStudents)
  const [editStudent,   setEditStudent]   = useState<ClassDetailStudent | null>(null)
  const [editName,      setEditName]      = useState('')
  const [editProgram,   setEditProgram]   = useState<Program>(PROGRAMS[0])
  const [editSection,   setEditSection]   = useState<string>(sectionsForGrade(PROGRAM_GRADE[PROGRAMS[0]])[0])
  const [editIsLate,    setEditIsLate]    = useState(false)
  const [editStream,    setEditStream]    = useState<typeof STREAMS[number] | ''>('')
  const [editGuardianProfession, setEditGuardianProfession] = useState('')
  const [editPreviousSchool,     setEditPreviousSchool]     = useState('')
  const [editLastQualification,  setEditLastQualification]  = useState('')
  const [editAddress,            setEditAddress]            = useState('')
  const [editGrNumber,           setEditGrNumber]           = useState('')
  const [editRollNumber,         setEditRollNumber]         = useState('')
  const [editRegistrationFee,    setEditRegistrationFee]    = useState('')
  const [editTuitionFee,         setEditTuitionFee]         = useState('')
  const [editParentName,           setEditParentName]           = useState('')
  const [editParentPhone,          setEditParentPhone]          = useState('')
  const [editParentSecondaryPhone, setEditParentSecondaryPhone] = useState('')
  const [editParentWhatsapp2,      setEditParentWhatsapp2]      = useState('')
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const editGrade = PROGRAM_GRADE[editProgram]

  const openEdit = (s: ClassDetailStudent) => {
    setEditStudent(s)
    setSaveError('')
    setEditName(s.name)
    setEditProgram((PROGRAMS.includes(s.program as Program) ? s.program : PROGRAMS[0]) as Program)
    setEditSection(s.section)
    setEditIsLate(s.isLate)
    setEditStream((s.stream as typeof editStream) ?? '')
    setEditGuardianProfession(s.guardianProfession ?? '')
    setEditPreviousSchool(s.previousSchool ?? '')
    setEditLastQualification(s.lastQualification ?? '')
    setEditAddress(s.address ?? '')
    setEditGrNumber(s.grNumber ?? '')
    setEditRollNumber(s.roll)
    setEditRegistrationFee(s.registrationFee !== null ? String(s.registrationFee) : '')
    setEditTuitionFee(s.tuitionFee !== null ? String(s.tuitionFee) : '')
    setEditParentName(s.parentName ?? '')
    setEditParentPhone(s.parentPhone ?? '')
    setEditParentSecondaryPhone(s.parentSecondaryPhone ?? '')
    setEditParentWhatsapp2(s.parentWhatsapp2 ?? '')
  }

  // Section options depend on grade (9-10 are Girls/Boys, 11-12 are A-E) —
  // reset to the first valid option whenever the modal's programme changes.
  useEffect(() => {
    const valid = sectionsForGrade(editGrade)
    if (!valid.includes(editSection as Section)) setEditSection(valid[0])
  }, [editGrade, editSection])

  const saveEdit = async () => {
    if (!editStudent) return
    setSaving(true)
    setSaveError('')

    const outcome = await updateStudentAction({
      id: editStudent.id,
      fullName: editName,
      program: editProgram,
      section: editSection as Section,
      isLate: editIsLate,
      stream: editStream || undefined,
      guardianProfession: editGuardianProfession || undefined,
      previousSchool: editPreviousSchool || undefined,
      lastQualification: editLastQualification || undefined,
      address: editAddress || undefined,
      grNumber: editGrNumber || undefined,
      rollNumber: isSuperAdmin ? (editRollNumber || undefined) : undefined,
      registrationFee: editRegistrationFee ? Number(editRegistrationFee) : undefined,
      tuitionFee: editTuitionFee ? Number(editTuitionFee) : undefined,
    })

    if (!outcome.ok) {
      setSaving(false)
      setSaveError(outcome.error)
      return
    }

    if (editStudent.parentId) {
      const parentOutcome = await updateParentContactAction({
        id: editStudent.parentId,
        fullName: editParentName,
        phone: editParentPhone,
        secondaryPhone: editParentSecondaryPhone || undefined,
        whatsapp2: editParentWhatsapp2 || undefined,
      })
      if (!parentOutcome.ok) {
        setSaving(false)
        setSaveError(parentOutcome.error)
        return
      }
    }

    setSaving(false)

    if (editGrade !== grade || editSection !== section) {
      // Moved out of this class-section view — drop it from the current roster.
      setStudents(prev => prev.filter(p => p.id !== editStudent.id))
    } else {
      setStudents(prev => prev.map(p => p.id === editStudent.id ? {
        ...p,
        name: editName, grade: editGrade, section: editSection, program: editProgram,
        isLate: editIsLate, stream: editStream || null,
        guardianProfession: editGuardianProfession || null, previousSchool: editPreviousSchool || null,
        lastQualification: editLastQualification || null, address: editAddress || null,
        grNumber: isSuperAdmin ? (editGrNumber || null) : (p.grNumber || editGrNumber || null),
        roll: isSuperAdmin && editRollNumber ? editRollNumber : p.roll,
        registrationFee: editRegistrationFee ? Number(editRegistrationFee) : null,
        tuitionFee: editTuitionFee ? Number(editTuitionFee) : null,
        parentName: editParentName || null, parentPhone: editParentPhone || null,
        parentSecondaryPhone: editParentSecondaryPhone || null, parentWhatsapp2: editParentWhatsapp2 || null,
      } : p))
    }
    setEditStudent(null)
  }

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null)
    const outcome = await deleteStudentAction({ id })
    if (outcome.ok) setStudents(prev => prev.filter(p => p.id !== id))
  }

  // Handle invalid route params gracefully
  const isValid = GRADES.includes(grade as Grade) && sectionsForGrade(grade as Grade).includes(section as Section)

  const enrolledTotal  = students.length
  const credSent       = students.filter(s => s.credentialSent).length
  const credPending    = enrolledTotal - credSent
  const pdfReady       = students.filter(s => s.pdfReady).length

  const STATS = [
    { label: 'In Pipeline',      value: String(enrolledTotal), icon: <Users size={22} />,       iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: `Grade ${grade} · Section ${section}` },
    { label: 'Credentials Sent', value: String(credSent),      icon: <CheckCircle2 size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: 'Parent IDs dispatched', subUp: true  },
    { label: 'Credentials Due',  value: String(credPending),   icon: <KeyRound size={22} />,    iconBg: credPending > 0 ? 'bg-danger-bg' : 'bg-neutral-100', iconColor: credPending > 0 ? 'text-danger' : 'text-neutral-400', sub: credPending > 0 ? 'Action required' : 'All dispatched' },
    { label: 'PDFs Ready',       value: String(pdfReady),      icon: <FileText size={22} />,    iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: `of ${enrolledTotal} students`         },
  ]

  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-[15px] font-semibold text-neutral-600">Invalid class: Grade {grade} · Section {section}</p>
        <Link href={basePath} className="mt-4 text-[13px] font-medium text-ink-600 hover:text-ink-800">
          ← Back to Admissions
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* ── Back nav + header ────────────────────────────────────────────── */}
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Admissions
        </Link>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink-700 flex items-center justify-center shrink-0">
                <span className="text-white font-mono text-[13px] font-bold">{grade}{section}</span>
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-neutral-900">Grade {grade} · Section {section}</h1>
                <p className="text-[13px] text-neutral-500 mt-0.5">Student registration pipeline — {enrolledTotal} record{enrolledTotal !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
          <Link
            href={`${basePath}/students/new`}
            className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline shrink-0"
          >
            <UserPlus size={14} /> Enrol Student
          </Link>
        </div>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Pipeline table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Registration Pipeline</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Edit records · manage parent IDs · delete with confirmation</p>
          </div>
          <span className="text-[11px] font-mono text-neutral-400 shrink-0 bg-ink-50 px-2 py-0.5 rounded-full text-ink-700 font-semibold">{grade}{section}</span>
        </div>

        {students.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Users size={24} className="text-neutral-300" />
            </div>
            <p className="text-[15px] font-semibold text-neutral-600 mb-1">No records for {grade}{section}</p>
            <p className="text-[13px] text-neutral-400 mb-5">Students registered in this class will appear here.</p>
            <Link href={`${basePath}/students/new`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline">
              <UserPlus size={14} /> Enrol First Student
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[580px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Parent</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Parent ID</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">PDF</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                          {INITIALS(s.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-medium text-neutral-900 truncate">{s.name}</span>
                          <span className="block text-[11px] font-mono text-neutral-400">{s.roll}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-neutral-600 hidden sm:table-cell">
                      {s.parentName ?? <span className="text-neutral-400 italic text-[12px]">Not assigned</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      {s.credentialSent
                        ? <span className="flex items-center gap-1 text-[11px] font-semibold text-success"><KeyRound size={11} /> Sent</span>
                        : <button className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-600 hover:text-ink-800 bg-ink-50 border border-ink-100 px-2 py-1 rounded-lg transition-colors">
                            <KeyRound size={11} /> Issue
                          </button>
                      }
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      {s.pdfReady
                        ? <button className="flex items-center gap-1 text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors"><FileText size={12} /> Download</button>
                        : <span className="text-[11px] text-neutral-400">Pending</span>
                      }
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-ink-600 hover:bg-ink-50 transition-colors"
                          title="Edit student record"
                        >
                          <Pencil size={13} />
                        </button>
                        {deleteConfirm === s.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] text-neutral-500 hover:text-neutral-700 font-medium">No</button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="text-[11px] font-semibold text-white bg-danger hover:bg-danger/90 px-2 py-0.5 rounded-lg transition-colors"
                            >
                              Yes
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 rounded-lg text-neutral-300 hover:text-danger hover:bg-danger-bg transition-colors" title="Delete record">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Student Modal ────────────────────────────────────────────── */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setEditStudent(null)} />
          <div className="relative w-full sm:max-w-2xl bg-white rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
                  <Pencil size={16} className="text-ink-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-neutral-900">Edit Student Record</h3>
                  <p className="text-[11.5px] font-mono text-neutral-400">{editStudent.roll}</p>
                </div>
              </div>
              <button onClick={() => setEditStudent(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5 overflow-y-auto">
              {saveError && (
                <div className="bg-danger-bg border border-danger/20 rounded-xl px-4 py-3">
                  <p className="text-[12.5px] text-danger leading-snug">{saveError}</p>
                </div>
              )}

              <p className="text-[11.5px] font-semibold text-neutral-400 uppercase tracking-wider">Student Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Full Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
                    Roll Number {!isSuperAdmin && <span className="text-neutral-400 font-normal">(Super Admin only)</span>}
                  </label>
                  <input
                    value={editRollNumber}
                    onChange={e => setEditRollNumber(e.target.value)}
                    readOnly={!isSuperAdmin}
                    className={`w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 font-mono focus:outline-none ${!isSuperAdmin ? 'text-neutral-500 bg-neutral-50 cursor-not-allowed' : 'text-neutral-800 focus:ring-2 focus:ring-ink-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
                    G.R. No. {!isSuperAdmin && editStudent.grNumber && <span className="text-neutral-400 font-normal">(locked once set)</span>}
                  </label>
                  <input
                    value={editGrNumber}
                    onChange={e => setEditGrNumber(e.target.value)}
                    readOnly={!isSuperAdmin && !!editStudent.grNumber}
                    placeholder="e.g. 4821"
                    className={`w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none ${!isSuperAdmin && editStudent.grNumber ? 'text-neutral-500 bg-neutral-50 font-mono cursor-not-allowed' : 'text-neutral-800 focus:ring-2 focus:ring-ink-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Programme</label>
                  <select value={editProgram} onChange={e => setEditProgram(e.target.value as Program)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer">
                    {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Section</label>
                  <select value={editSection} onChange={e => setEditSection(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer">
                    {sectionsForGrade(editGrade).map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
                {(editGrade === '11' || editGrade === '12') && (
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Stream <span className="text-neutral-400 font-normal">(Intermediate)</span></label>
                    <select value={editStream} onChange={e => setEditStream(e.target.value as typeof editStream)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer">
                      <option value="">Not selected</option>
                      {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2.5 p-3.5 bg-warning-bg/50 border border-warning/20 rounded-xl cursor-pointer select-none">
                <input type="checkbox" checked={editIsLate} onChange={e => setEditIsLate(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-warning focus:ring-warning/30" />
                <span className="text-[12.5px] text-warning leading-relaxed">
                  <strong>Late enrollment</strong> — enables strict video watch-time tracking for lecture catch-up.
                </span>
              </label>

              <div className="pt-3 border-t border-neutral-100">
                <p className="text-[11.5px] font-semibold text-neutral-400 uppercase tracking-wider mb-4">Academic Background <span className="text-neutral-400 font-normal normal-case">(optional)</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">School / college</label>
                    <input value={editPreviousSchool} onChange={e => setEditPreviousSchool(e.target.value)} placeholder="e.g. City Public School" className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Last qualification</label>
                    <input value={editLastQualification} onChange={e => setEditLastQualification(e.target.value)} placeholder="e.g. Grade 8 · Distinction" className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100">
                <p className="text-[11.5px] font-semibold text-neutral-400 uppercase tracking-wider mb-4">Parent / Guardian</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Parent&apos;s name</label>
                    <input
                      value={editParentName}
                      onChange={e => setEditParentName(e.target.value)}
                      readOnly={!editStudent.parentId}
                      className={`w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none ${!editStudent.parentId ? 'text-neutral-500 bg-neutral-50 cursor-not-allowed' : 'text-neutral-800 focus:ring-2 focus:ring-ink-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">WhatsApp No.</label>
                    <input
                      value={editParentPhone}
                      onChange={e => setEditParentPhone(e.target.value)}
                      readOnly={!editStudent.parentId}
                      className={`w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none ${!editStudent.parentId ? 'text-neutral-500 bg-neutral-50 cursor-not-allowed' : 'text-neutral-800 focus:ring-2 focus:ring-ink-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Phone No. <span className="text-neutral-400 font-normal">(optional)</span></label>
                    <input
                      value={editParentSecondaryPhone}
                      onChange={e => setEditParentSecondaryPhone(e.target.value)}
                      readOnly={!editStudent.parentId}
                      className={`w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none ${!editStudent.parentId ? 'text-neutral-500 bg-neutral-50 cursor-not-allowed' : 'text-neutral-800 focus:ring-2 focus:ring-ink-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">WhatsApp 2 <span className="text-neutral-400 font-normal">(optional)</span></label>
                    <input
                      value={editParentWhatsapp2}
                      onChange={e => setEditParentWhatsapp2(e.target.value)}
                      readOnly={!editStudent.parentId}
                      className={`w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none ${!editStudent.parentId ? 'text-neutral-500 bg-neutral-50 cursor-not-allowed' : 'text-neutral-800 focus:ring-2 focus:ring-ink-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Profession <span className="text-neutral-400 font-normal">(optional)</span></label>
                    <input value={editGuardianProfession} onChange={e => setEditGuardianProfession(e.target.value)} placeholder="e.g. Engineer" className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Address <span className="text-neutral-400 font-normal">(optional)</span></label>
                    <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="House / street / area" className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                  </div>
                </div>
                {!editStudent.parentId && (
                  <p className="text-[11.5px] text-neutral-400 mt-2">No parent account linked — contact details can&apos;t be edited here.</p>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100">
                <p className="text-[11.5px] font-semibold text-neutral-400 uppercase tracking-wider mb-4">Office Use <span className="text-neutral-400 font-normal normal-case">(optional)</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Registration fee</label>
                    <input type="number" min="0" value={editRegistrationFee} onChange={e => setEditRegistrationFee(e.target.value)} placeholder="PKR" className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Tuition fee</label>
                    <input type="number" min="0" value={editTuitionFee} onChange={e => setEditTuitionFee(e.target.value)} placeholder="PKR" className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-5 border-t border-neutral-100 shrink-0">
              <button onClick={() => setEditStudent(null)} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 py-3 text-[13px] font-semibold text-white bg-ink-700 hover:bg-ink-800 rounded-xl transition-colors disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
