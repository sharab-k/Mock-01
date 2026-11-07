import { Download } from 'lucide-react'

// Downloads one class section as an Excel sheet (Roll No, Name, GR Number, Contact, Status). A plain link: the
// server builds the file and the browser saves it, so it works the same on every screen that shows a class.
export default function ExportClassLink({ grade, section, className = '' }: { grade: string; section: string; className?: string }) {
  return (
    <a
      href={`/api/students/export?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`}
      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-700 hover:text-ink-900 no-underline ${className}`}
    >
      <Download size={12} /> Export class (Excel)
    </a>
  )
}
