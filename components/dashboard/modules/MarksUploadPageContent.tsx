'use client'

import { useState } from 'react'
import { Upload, Download } from 'lucide-react'
import MarksBulkUploadModal from '@/components/dashboard/modules/MarksBulkUploadModal'

// A file download, not a page navigation.
const TEMPLATE_URL = '/api/uploads/template/marks'

export default function MarksUploadPageContent() {
  const [open, setOpen] = useState(false)
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-[20px] font-bold text-neutral-900">Upload Marks</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Upload a results spreadsheet and the marks are filed against each student, subject and exam date.</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-4">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-[13.5px] font-semibold px-4 py-2.5 rounded-xl bg-ink-700 text-white hover:bg-ink-800">
          <Upload size={15} /> Bulk upload
        </button>
        <div className="space-y-2 text-[12.5px] text-neutral-600 leading-relaxed">
          <p><b className="text-neutral-800">Result sheets</b> (one column per test): G.R. number and name down the side; for each test its date on top, then its total marks, then the subject. Several classes per file, and several tables per sheet, are fine. Shared columns such as &ldquo;M/B&rdquo; or &ldquo;CH/CM&rdquo; follow each student&apos;s stream. Words like NILL, LEFT or &ldquo;not come&rdquo; mean no mark.</p>
          <p><b className="text-neutral-800">Simple lists</b> (one row per mark): GR No (or Roll No), Subject, Marks, Total, Exam Date.</p>
          <p>You&apos;ll be asked whether the file is Monthly, Half-Yearly or Final, and shown a full check of the file before anything is saved.</p>
        </div>
        <a href={TEMPLATE_URL} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-700 hover:underline">
          <Download size={13} /> Download a simple-list template (CSV)
        </a>
      </div>

      {open && <MarksBulkUploadModal onClose={() => setOpen(false)} />}
    </div>
  )
}
