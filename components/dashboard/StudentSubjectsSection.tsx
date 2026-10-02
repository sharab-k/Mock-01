'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Check, Loader2 } from 'lucide-react'
import { fetchStudentSubjects, setStudentElectivesAction, type StudentSubjectRow } from '@/lib/actions/subject-enrollments'

// Super Admin's per-student subject editor, shown inside the student drawer.
// Compulsory subjects are implicit for the whole grade (shown read-only);
// elected subjects are toggled on/off for this one student and saved together.
export default function StudentSubjectsSection({ studentId, gradeLevel }: { studentId: string; gradeLevel: string }) {
  const [subjects, setSubjects] = useState<StudentSubjectRow[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    let mounted = true
    fetchStudentSubjects(studentId).then((res) => {
      if (!mounted) return
      if (!res.ok) { setError(res.error); setSubjects([]); return }
      const electedOn = new Set(res.subjects.filter((s) => s.type === 'elected' && s.enrolled).map((s) => s.id))
      setSubjects(res.subjects)
      setPicked(electedOn)
      setSaved(electedOn)
    })
    return () => { mounted = false }
  }, [studentId])

  const compulsory = (subjects ?? []).filter((s) => s.type === 'compulsory')
  const elected = (subjects ?? []).filter((s) => s.type === 'elected')
  const dirty = picked.size !== saved.size || [...picked].some((id) => !saved.has(id))

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setJustSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    const outcome = await setStudentElectivesAction({ studentId, subjectIds: [...picked] })
    setSaving(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setSaved(new Set(picked))
    setJustSaved(true)
  }

  return (
    <div className="space-y-3 pt-4 border-t border-neutral-100">
      <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Subjects · Grade {gradeLevel}</p>

      {subjects === null ? (
        <div className="flex items-center gap-2 text-[12px] text-neutral-400"><Loader2 size={13} className="animate-spin" /> Loading subjects…</div>
      ) : subjects.length === 0 ? (
        <p className="text-[12.5px] text-neutral-400">No subjects set up for this grade yet — add them under Subjects first.</p>
      ) : (
        <>
          {compulsory.length > 0 && (
            <div>
              <p className="text-[11.5px] text-neutral-400 mb-1.5">Compulsory — every student in the grade</p>
              <div className="flex flex-wrap gap-1.5">
                {compulsory.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-ink-100 text-ink-700">
                    <BookOpen size={11} /> {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {elected.length > 0 && (
            <div>
              <p className="text-[11.5px] text-neutral-400 mb-1.5">Elected — tap to add or remove for this student</p>
              <div className="flex flex-wrap gap-1.5">
                {elected.map((s) => {
                  const on = picked.has(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                        on ? 'bg-warning-bg text-warning border-warning/30' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {on ? <Check size={11} /> : <BookOpen size={11} />} {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && <p className="text-[12px] text-danger">{error}</p>}

          {elected.length > 0 && (
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="w-full flex items-center justify-center gap-2 text-[12.5px] font-semibold text-ink-700 bg-ink-50 border border-ink-100 py-2.5 rounded-xl hover:bg-ink-100/50 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : justSaved && !dirty ? 'Subjects saved' : 'Save subjects'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
