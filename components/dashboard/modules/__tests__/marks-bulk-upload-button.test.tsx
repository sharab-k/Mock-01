import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }), usePathname: () => '/marks' }))

import MarksDashboardContent from '../MarksDashboardContent'
import { GRADES, sectionsForGrade } from '@/lib/students/constants'

const props = {
  basePath: '/marks',
  classStats: Object.fromEntries(GRADES.map((g) => [g, Object.fromEntries(sectionsForGrade(g).map((sec) => [sec, { avg: 0, entries: 0, graded: 0, total: 20 }]))])),
  totalEnrolled: 596,
  entriesThisWeek: 0,
  subjectsCovered: 10,
  studentsGraded: 9,
  pendingEntry: 587,
  tierCounts: { Distinction: 0, Merit: 0, Pass: 0, 'Below Pass': 0 },
  totalTiered: 0,
  subjects: [],
}

beforeEach(() => { refresh.mockReset() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Bulk Upload on the marks dashboard', () => {
  it('opens the real upload dialog, not just a format hint', () => {
    render(<MarksDashboardContent {...props} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByText('Bulk Upload'))
    expect(screen.getByRole('dialog', { name: 'Bulk upload marks' })).toBeTruthy()
    expect(screen.queryByText('CSV format required')).toBeNull()
  })

  it('explains the file: found by GR number, the columns, and a template to download', () => {
    render(<MarksDashboardContent {...props} />)
    fireEvent.click(screen.getByText('Bulk Upload'))
    expect(screen.getByText(/found by their/i).textContent).toMatch(/G\.R\. number/)
    expect(screen.getByText(/GR No · Student Name · Subject · Marks · Total · Exam Date/)).toBeTruthy()
    const template = screen.getByText(/Download a ready-made template/).closest('a')!
    expect(template.getAttribute('href')).toBe('/api/uploads/template/marks')
  })

  it('accepts a spreadsheet or CSV, and the check step needs both an exam and a file', () => {
    render(<MarksDashboardContent {...props} />)
    fireEvent.click(screen.getByText('Bulk Upload'))
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    expect(input.accept).toBe('.xlsx,.xls,.csv')
    expect((screen.getByRole('button', { name: /^check file$/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('checks the file first, saves on a second explicit step, then refreshes the dashboard', async () => {
    const preview = { mode: 'preview', format: 'rows', examType: 'monthly', totalRows: 2, toSave: 2, students: 2, saved: 0, inserted: 0, updated: 0, skipped: 0, noMark: 0, errors: [], warnings: [], tests: [] }
    const saved = { ...preview, mode: 'saved', saved: 2, inserted: 2 }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => preview })
      .mockResolvedValueOnce({ ok: true, json: async () => saved })
    vi.stubGlobal('fetch', fetchMock)

    render(<MarksDashboardContent {...props} />)
    fireEvent.click(screen.getByText('Bulk Upload'))
    fireEvent.click(screen.getByText('Monthly'))
    fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]')!, { target: { files: [new File(['GR No,Subject,Marks,Total,Exam Date'], 'marks.csv')] } })
    fireEvent.click(screen.getByRole('button', { name: /^check file$/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect((fetchMock.mock.calls[0]![1] as { body: FormData }).body.get('dryRun')).toBe('1')
    expect(refresh).not.toHaveBeenCalled() // a preview changes nothing

    const saveButton = await screen.findByRole('button', { name: /save 2 marks/i })
    fireEvent.click(saveButton)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect((fetchMock.mock.calls[1]![1] as { body: FormData }).body.get('dryRun')).toBe('0')
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    vi.unstubAllGlobals()
  })

  const chooseFile = (file: File) => {
    fireEvent.click(screen.getByText('Bulk Upload'))
    fireEvent.click(screen.getByText('Monthly'))
    fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]')!, { target: { files: [file] } })
  }

  it('an old .xls file can be picked, and is answered with the steps to convert it, without sending anything', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<MarksDashboardContent {...props} />)
    fireEvent.click(screen.getByText('Bulk Upload'))
    expect(document.querySelector<HTMLInputElement>('input[type="file"]')!.accept).toContain('.xls')
    chooseFile(new File(['x'], 'results.xls'))
    expect(screen.getByText(/old Excel file/)).toBeTruthy()
    expect(screen.getByText(/Save As/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^check file$/i }))
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('a file over the limit is refused up front with its size, not a vague failure', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<MarksDashboardContent {...props} />)
    const big = new File(['x'], 'results.xlsx')
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    chooseFile(big)
    expect(screen.getByText(/6\.0 MB and the limit is 4 MB/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^check file$/i }))
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('a server failure with no message (such as 413 from the host) is explained in plain words', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => { throw new Error('not json') } }))
    render(<MarksDashboardContent {...props} />)
    chooseFile(new File(['GR No,Subject'], 'results.xlsx'))
    fireEvent.click(screen.getByRole('button', { name: /^check file$/i }))
    await waitFor(() => expect(screen.getByText(/too large for the server/)).toBeTruthy())
    vi.unstubAllGlobals()
  })
})
