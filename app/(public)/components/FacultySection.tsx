type FacultyMember = {
  initials: string
  name: string
  role: string
  scope: string
}

const FACULTY: FacultyMember[] = [
  { initials: 'AK', name: 'A. Khan', role: 'Senior Mathematics Faculty', scope: 'Matric & Intermediate' },
  { initials: 'SR', name: 'S. Raza', role: 'Head of Sciences', scope: 'All programmes' },
  { initials: 'FA', name: 'F. Ahmed', role: 'English & Literature', scope: 'Primary to Intermediate' },
  { initials: 'NS', name: 'N. Siddiqui', role: 'Computer Science', scope: 'Matric & Intermediate' },
]

const AVATAR_COLORS = [
  { bg: 'rgba(73,95,141,0.25)', text: '#A5B0CA' },
  { bg: 'rgba(61,113,87,0.25)', text: '#7BBFA6' },
  { bg: 'rgba(126,88,126,0.25)', text: '#C4A0C4' },
  { bg: 'rgba(84,123,150,0.25)', text: '#94B8CC' },
]

export default function FacultySection() {
  return (
    <section className="bg-ink-900 py-20 sm:py-28" id="faculty">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-md bg-ink-700 flex items-center justify-center">
              <div className="w-2 h-2 rounded-sm bg-ink-400" />
            </div>
            <span className="text-ink-400 text-[13px] font-semibold">Faculty</span>
          </div>
          <h2 className="font-serif font-semibold text-[32px] sm:text-[38px] leading-[1.15] text-white">
            Meet our{' '}
            <span className="text-ink-400">expert</span>
            {' '}instructors
          </h2>
          <p className="text-[14px] text-ink-300 mt-4 max-w-[480px] mx-auto leading-relaxed">
            Experienced educators who combine subject mastery with a genuine commitment to each
            student&apos;s progress.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {FACULTY.map((f, i) => (
            <div
              key={f.initials}
              className="rounded-2xl overflow-hidden border border-ink-800 hover:border-ink-700 transition-all group"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              {/* Avatar area */}
              <div
                className="h-36 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center font-mono text-[20px] font-semibold"
                  style={{ background: AVATAR_COLORS[i].bg, color: AVATAR_COLORS[i].text }}
                >
                  {f.initials}
                </div>
              </div>

              {/* Info */}
              <div className="p-5 pt-4 border-t border-ink-800">
                <h4 className="text-[14px] font-semibold text-white mb-0.5">{f.name}</h4>
                <span className="block text-[12px] text-ink-400 mb-3">{f.role}</span>
                <span
                  className="inline-flex text-[10.5px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(73,95,141,0.18)', color: '#A5B0CA' }}
                >
                  {f.scope}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
