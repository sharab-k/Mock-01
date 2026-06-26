import StatCard from '@/components/dashboard/StatCard'
import AttendanceMarker from '@/components/dashboard/AttendanceMarker'
import { Users, CalendarCheck, BookOpen, Clock } from 'lucide-react'

const STATS = [
  { label: 'My Students',    value: '94',  icon: <Users size={22} />,        iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'across 3 classes'         },
  { label: 'Classes Today',  value: '4',   icon: <Clock size={22} />,        iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: '2 remaining today'        },
  { label: 'Class Avg Score',value: '78%', icon: <BookOpen size={22} />,     iconBg: 'bg-success-bg', iconColor: 'text-success', sub: '↑ 3% vs last term', subUp: true },
  { label: 'Attendance Rate',value: '92%', icon: <CalendarCheck size={22} />,iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'across my classes'        },
]

const TIMETABLE = [
  { time: '08:00 – 08:45', subject: 'Mathematics',  class: 'X-A',   room: 'R-101', done: true  },
  { time: '09:00 – 09:45', subject: 'Mathematics',  class: 'IX-B',  room: 'R-101', done: true  },
  { time: '10:30 – 11:15', subject: 'Mathematics',  class: 'VIII-A',room: 'R-203', done: false },
  { time: '12:00 – 12:45', subject: 'Mathematics',  class: 'X-B',   room: 'R-101', done: false },
]

const RECENT_MARKS = [
  { student: 'Ahmed Ali',    class: 'X-A',   subject: 'Mathematics', exam: 'Monthly',     score: 87, max: 100, grade: 'A'  },
  { student: 'Sara Khan',    class: 'IX-B',  subject: 'Mathematics', exam: 'Monthly',     score: 79, max: 100, grade: 'B+' },
  { student: 'Bilal Raza',   class: 'X-A',   subject: 'Mathematics', exam: 'Half-Yearly', score: 74, max: 100, grade: 'B'  },
  { student: 'Fatima Noor',  class: 'VIII-A',subject: 'Mathematics', exam: 'Monthly',     score: 91, max: 100, grade: 'A+' },
  { student: 'Usman Sheikh', class: 'X-B',   subject: 'Mathematics', exam: 'Monthly',     score: 61, max: 100, grade: 'C+' },
  { student: 'Hina Baig',    class: 'IX-B',  subject: 'Mathematics', exam: 'Half-Yearly', score: 55, max: 100, grade: 'C'  },
]

const MY_CLASSES = [
  { name: 'Class X-A',    students: 28, avgScore: 81, attendance: '93%' },
  { name: 'Class IX-B',   students: 25, avgScore: 74, attendance: '90%' },
  { name: 'Class VIII-A', students: 24, avgScore: 79, attendance: '94%' },
  { name: 'Class X-B',    students: 17, avgScore: 77, attendance: '91%' },
]

const EXAM_STYLE: Record<string, string> = {
  'Monthly':     'bg-ink-100 text-ink-700',
  'Half-Yearly': 'bg-warning-bg text-warning',
}

const GRADE_COLOR = (g: string) => {
  if (g.startsWith('A')) return 'text-success font-bold'
  if (g.startsWith('B')) return 'text-ink-600 font-bold'
  return 'text-warning font-bold'
}

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

export default function TeacherDashboard() {
  return (
    <>
      {/* Page header + identity */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">My Dashboard</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Mathematics · Classes X-A, IX-B, VIII-A, X-B · Term 2 2025–26</p>
        </div>
        <span className="text-[12px] text-neutral-400">24 Jun 2026</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Attendance marker */}
      <AttendanceMarker />

      {/* Main two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Today's timetable — 1/3 */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14px] font-semibold text-neutral-900">Today's Timetable</h2>
            <a href="/teacher/timetable" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">Full →</a>
          </div>
          <div className="space-y-3">
            {TIMETABLE.map((p, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                  p.done
                    ? 'bg-neutral-50 border-neutral-100 opacity-60'
                    : 'bg-ink-50 border-ink-100'
                }`}
              >
                <div className={`w-1 h-12 rounded-full shrink-0 ${p.done ? 'bg-neutral-300' : 'bg-ink-500'}`} />
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-neutral-900">{p.subject}</span>
                  <span className="block text-[11.5px] text-neutral-500 mt-0.5">{p.class} · Room {p.room}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[11px] font-mono text-neutral-500">{p.time.split('–')[0].trim()}</span>
                  {p.done
                    ? <span className="block text-[10px] text-neutral-400 mt-0.5">Done</span>
                    : <span className="block text-[10px] text-ink-600 font-semibold mt-0.5">Upcoming</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent marks — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-[14px] font-semibold text-neutral-900">Recent Marks Entered</h2>
            <a href="/teacher/marks" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">View all →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-6 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Exam</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Score</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {RECENT_MARKS.map((m, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                          {INITIALS(m.student)}
                        </div>
                        <span className="font-medium text-neutral-900">{m.student}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 font-mono text-[12px]">{m.class}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${EXAM_STYLE[m.exam] ?? ''}`}>
                        {m.exam}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-neutral-700">{m.score}/{m.max}</td>
                    <td className={`px-4 py-3.5 font-mono text-[13px] ${GRADE_COLOR(m.grade)}`}>{m.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* My classes overview */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-[14px] font-semibold text-neutral-900">My Classes</h2>
          <a href="/teacher/students" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">View students →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
          {MY_CLASSES.map((c) => (
            <div key={c.name} className="p-6">
              <span className="block text-[14px] font-semibold text-neutral-900 mb-1">{c.name}</span>
              <span className="block text-[11.5px] text-neutral-500 mb-4">{c.students} students · Mathematics</span>
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11.5px] mb-1">
                    <span className="text-neutral-500">Avg Score</span>
                    <span className={`font-semibold ${c.avgScore >= 80 ? 'text-success' : 'text-warning'}`}>{c.avgScore}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.avgScore >= 80 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${c.avgScore}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11.5px] mb-1">
                    <span className="text-neutral-500">Attendance</span>
                    <span className="font-semibold text-ink-600">{c.attendance}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-ink-400" style={{ width: c.attendance }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
