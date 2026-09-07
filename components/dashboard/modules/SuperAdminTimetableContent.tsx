'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock3, Pencil, Plus, Trash2, User, X } from 'lucide-react'
import { GRADES, sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'
import {
  fetchClassTimetable, createTimetablePeriodAction, updateTimetablePeriodAction, deleteTimetablePeriodAction,
  type TimetablePeriod,
} from '@/lib/actions/timetable'
import { WEEKDAYS, WEEKDAY_LABEL, type Weekday } from '@/lib/timetable/constants'
import type { Teacher } from '@/lib/teachers/fetch'

type Props = { initialTeachers: Teacher[] }

type FormState = {
  id?: string
  dayOfWeek: Weekday
  startTime: string
  endTime: string
  subject: string
  teacherId: string
}

const emptyForm = (day: Weekday): FormState => ({ dayOfWeek: day, startTime: '', endTime: '', subject: '', teacherId: '' })

export default function SuperAdminTimetableContent({ initialTeachers }: Props) {
  const [grade, setGrade] = useState<Grade>(GRADES[0])
  const [section, setSection] = useState<Section>(sectionsForGrade(GRADES[0])[0])
  const [periods, setPeriods] = useState<TimetablePeriod[] | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load(g: Grade, s: Section) {
    setPeriods(null)
    fetchClassTimetable(g, s).then(setPeriods)
  }

  useEffect(() => { load(grade, section) }, [grade, section])

  function changeGrade(g: Grade) {
    setGrade(g)
    const valid = sectionsForGrade(g)
    setSection(valid[0])
  }

  const byDay = useMemo(() => {
    const map = new Map<Weekday, TimetablePeriod[]>()
    for (const d of WEEKDAYS) map.set(d, [])
    for (const p of periods ?? []) map.get(p.dayOfWeek)?.push(p)
    return map
  }, [periods])

  function openCreate(day: Weekday) {
    setForm(emptyForm(day))
    setError('')
  }

  function openEdit(p: TimetablePeriod) {
    setForm({ id: p.id, dayOfWeek: p.dayOfWeek, startTime: p.startTime.slice(0, 5), endTime: p.endTime.slice(0, 5), subject: p.subject, teacherId: p.teacherId ?? '' })
    setError('')
  }

  async function handleSave() {
    if (!form || !form.startTime || !form.endTime || !form.subject.trim()) return
    setSaving(true)
    setError('')
    const input = {
      gradeLevel: grade, section, dayOfWeek: form.dayOfWeek,
      startTime: form.startTime, endTime: form.endTime,
      subject: form.subject.trim(), teacherId: form.teacherId,
    }
    const outcome = form.id
      ? await updateTimetablePeriodAction({ ...input, id: form.id })
      : await createTimetablePeriodAction(input)
    setSaving(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setForm(null)
    load(grade, section)
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this period?')) return
    deleteTimetablePeriodAction({ id }).then((outcome) => { if (outcome.ok) load(grade, section) })
  }

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Class Timetable</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">One weekly schedule per class, used all year — pick a grade and section to build or edit it.</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 grid grid-cols-2 gap-3 max-w-sm">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Grade</label>
          <select value={grade} onChange={(e) => changeGrade(e.target.value as Grade)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer">
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Section</label>
          <select value={section} onChange={(e) => setSection(e.target.value as Section)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer">
            {sectionsForGrade(grade).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {periods === null ? (
        <div className="text-[13px] text-neutral-400 py-8 text-center">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {WEEKDAYS.map((day) => {
            const dayPeriods = byDay.get(day) ?? []
            return (
              <div key={day} className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                  <h2 className="text-[13px] font-semibold text-neutral-900">{WEEKDAY_LABEL[day]}</h2>
                  <button onClick={() => openCreate(day)} className="flex items-center gap-1 text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors">
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="divide-y divide-neutral-100">
                  {dayPeriods.length === 0 ? (
                    <p className="px-4 py-4 text-[12px] text-neutral-400 text-center">No periods yet.</p>
                  ) : (
                    dayPeriods.map((p) => (
                      <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-2 group">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
                            <Clock3 size={11} /> {p.startTime.slice(0, 5)}–{p.endTime.slice(0, 5)}
                          </div>
                          <p className="text-[13px] font-medium text-neutral-900 mt-0.5 truncate">{p.subject}</p>
                          {p.teacherName && (
                            <div className="flex items-center gap-1.5 text-[11.5px] text-neutral-500 mt-0.5">
                              <User size={11} /> {p.teacherName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(p)} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-ink-700 hover:bg-neutral-100 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(p.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-danger hover:bg-danger-bg transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !saving && setForm(null)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">{form.id ? 'Edit period' : 'Add period'} — {WEEKDAY_LABEL[form.dayOfWeek]}</h3>
              <button onClick={() => setForm(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              {!!error && <p className="text-[12.5px] text-danger">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Start time</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">End time</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Subject</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Teacher (optional)</label>
                <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer">
                  <option value="">Unassigned</option>
                  {initialTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !form.startTime || !form.endTime || !form.subject.trim()}
                className="w-full py-3 text-[13px] font-semibold bg-ink-700 text-white rounded-xl hover:bg-ink-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Period'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
