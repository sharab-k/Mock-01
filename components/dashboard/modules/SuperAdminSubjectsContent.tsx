'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Users, BookOpen } from 'lucide-react'
import { GRADES } from '@/lib/students/constants'
import { createSubjectAction, removeSubjectAction, type Subject } from '@/lib/actions/subjects'
import SubjectEnrollmentDrawer from '@/components/dashboard/SubjectEnrollmentDrawer'

const TYPE_STYLE: Record<Subject['type'], string> = {
  compulsory: 'bg-ink-100 text-ink-700',
  elected: 'bg-warning-bg text-warning',
}

export default function SuperAdminSubjectsContent({ initialSubjects }: { initialSubjects: Subject[] }) {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [addingForGrade, setAddingForGrade] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<Subject['type']>('compulsory')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [enrollTarget, setEnrollTarget] = useState<Subject | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const byGrade = useMemo(() => {
    const map = new Map<string, Subject[]>()
    for (const g of GRADES) map.set(g, [])
    for (const s of subjects) map.get(s.gradeLevel)?.push(s)
    return map
  }, [subjects])

  function openAdd(grade: string) {
    setAddingForGrade(grade)
    setName('')
    setType('compulsory')
    setError('')
  }

  async function handleAdd() {
    if (!addingForGrade || !name.trim()) return
    setSaving(true)
    setError('')
    const outcome = await createSubjectAction({ gradeLevel: addingForGrade, name: name.trim(), type })
    setSaving(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setSubjects((prev) => [...prev, { id: outcome.id, gradeLevel: addingForGrade, name: name.trim(), type, createdAt: new Date().toISOString() }])
    setAddingForGrade(null)
  }

  async function handleRemove(subject: Subject) {
    if (!confirm(`Remove ${subject.name} from Grade ${subject.gradeLevel}? Existing tests and marks recorded against it are kept.`)) return
    setRemovingId(subject.id)
    const outcome = await removeSubjectAction({ id: subject.id })
    setRemovingId(null)
    if (outcome.ok) setSubjects((prev) => prev.filter((s) => s.id !== subject.id))
  }

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Subjects</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          Manage each grade&apos;s subject list. Compulsory subjects apply to every student in the grade automatically —
          elected subjects need students enrolled one by one.
        </p>
      </div>

      <div className="space-y-5">
        {GRADES.map((grade) => {
          const gradeSubjects = byGrade.get(grade) ?? []
          return (
            <div key={grade} className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <h2 className="text-[14px] font-semibold text-neutral-900">Grade {grade}</h2>
                <button
                  onClick={() => openAdd(grade)}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600 hover:text-ink-800 transition-colors"
                >
                  <Plus size={13} /> Add subject
                </button>
              </div>

              <div className="p-4">
                {addingForGrade === grade && (
                  <div className="mb-3 flex items-center gap-2 flex-wrap bg-neutral-50 rounded-xl p-3">
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Subject name…"
                      className="flex-1 min-w-[160px] text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10"
                    />
                    <select value={type} onChange={(e) => setType(e.target.value as Subject['type'])} className="text-[12.5px] border border-neutral-200 rounded-lg px-2.5 py-2 bg-white cursor-pointer">
                      <option value="compulsory">Compulsory</option>
                      <option value="elected">Elected</option>
                    </select>
                    <button onClick={handleAdd} disabled={saving || !name.trim()} className="px-3 py-2 bg-ink-700 text-white text-[12.5px] font-semibold rounded-lg hover:bg-ink-800 disabled:opacity-50 transition-colors">
                      {saving ? 'Adding…' : 'Add'}
                    </button>
                    <button onClick={() => setAddingForGrade(null)} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors">
                      <X size={14} />
                    </button>
                    {error && <p className="basis-full text-[12px] text-danger">{error}</p>}
                  </div>
                )}

                {gradeSubjects.length === 0 ? (
                  <p className="text-[12.5px] text-neutral-400 py-2">No subjects added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {gradeSubjects.map((s) => (
                      <div key={s.id} className={`group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full text-[12.5px] font-medium ${TYPE_STYLE[s.type]}`}>
                        <BookOpen size={12} />
                        <span>{s.name}</span>
                        <span className="text-[10px] opacity-70 font-normal">{s.type === 'compulsory' ? 'Compulsory' : 'Elected'}</span>
                        {s.type === 'elected' && (
                          <button onClick={() => setEnrollTarget(s)} title="Manage enrollment" className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/60 transition-colors">
                            <Users size={12} />
                          </button>
                        )}
                        <button onClick={() => handleRemove(s)} disabled={removingId === s.id} title="Remove subject" className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/60 transition-colors disabled:opacity-50">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {enrollTarget && (
        <SubjectEnrollmentDrawer subject={enrollTarget} onClose={() => setEnrollTarget(null)} />
      )}
    </>
  )
}
