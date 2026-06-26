import Image from 'next/image'

type Programme = {
  grade: string
  title: string
  description: string
  accentColor: string
  accentBg: string
  subjects: string[]
  photo: string
  photoAlt: string
}

const PROGRAMMES: Programme[] = [
  {
    grade: 'Grades 1–5',
    title: 'Primary Years',
    description: 'Foundational literacy, numeracy and a structured daily routine that sets habits for life.',
    accentColor: '#487A63',
    accentBg: '#EAF0ED',
    subjects: ['Literacy', 'Numeracy', 'General Science', 'Urdu'],
    photo: '/images/classroom-primary.jpg',
    photoAlt: 'Young children in a Primary Years classroom',
  },
  {
    grade: 'Grades 6–8',
    title: 'Middle School',
    description: 'Subject specialisation begins, with monthly assessments tracked per student.',
    accentColor: '#7E587E',
    accentBg: '#EFECEF',
    subjects: ['Mathematics', 'Sciences', 'English', 'Islamiyat'],
    photo: '/images/classroom-matric.jpg',
    photoAlt: 'Middle school students engaged in a lesson',
  },
  {
    grade: 'Grades 9–10',
    title: 'Matriculation',
    description: 'Science, Computer Science & Arts streams, aligned to board exam patterns.',
    accentColor: '#A26D53',
    accentBg: '#F1ECE9',
    subjects: ['Physics', 'Chemistry', 'Biology / CS', 'Mathematics'],
    photo: '/images/classroom-intermediate.jpg',
    photoAlt: 'Teacher at chalkboard with maths formulas',
  },
  {
    grade: 'Grades 11–12',
    title: 'Intermediate',
    description: 'Pre-Medical, Pre-Engineering & Commerce pathways toward board & entry exams.',
    accentColor: '#547B96',
    accentBg: '#EAEEF0',
    subjects: ['Pre-Medical', 'Pre-Engineering', 'Commerce'],
    photo: '/images/classroom-group.jpg',
    photoAlt: 'Intermediate students with teacher in classroom',
  },
]

export default function ProgrammesSection() {
  return (
    <section
      className="bg-white py-20 sm:py-28"
      id="programmes"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-md bg-ink-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-ink-600" />
              </div>
              <span className="text-ink-600 text-[13px] font-semibold">Programmes</span>
            </div>
            <h2 className="font-serif font-semibold text-[32px] sm:text-[38px] leading-[1.15] text-neutral-950">
              Explore our{' '}
              <span className="text-ink-500">academic</span>
              {' '}programmes
            </h2>
          </div>
          <a
            href="#enquiry"
            className="shrink-0 inline-flex items-center gap-1.5 text-[13px] text-ink-600 font-semibold no-underline hover:text-ink-800 transition-colors"
          >
            Enquire about a programme
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROGRAMMES.map((p) => (
            <div
              key={p.title}
              className="group rounded-2xl bg-white border border-neutral-200 overflow-hidden hover:shadow-2 hover:border-neutral-300 transition-all"
            >
              {/* Photo header */}
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={p.photo}
                  alt={p.photoAlt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
                />
                {/* Accent bar at bottom of photo */}
                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: p.accentColor }} />
              </div>

              <div className="p-6">
                <div
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-mono font-semibold mb-5"
                  style={{ background: p.accentBg, color: p.accentColor }}
                >
                  {p.grade}
                </div>

                <h3 className="text-[17px] font-semibold text-neutral-950 mb-2">{p.title}</h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed mb-5">{p.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {p.subjects.map((s) => (
                    <span key={s} className="text-[10.5px] text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>

                <a
                  href="#enquiry"
                  className="inline-flex items-center gap-1 text-[12px] font-semibold no-underline transition-colors"
                  style={{ color: p.accentColor }}
                >
                  Enquire about this programme
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
