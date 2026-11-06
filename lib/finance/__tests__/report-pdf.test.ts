import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { renderReportPdf, type ReportData } from '../report-pdf'
import { firstOfMonth, monthRange } from '../constants'

const data = (rows: number): ReportData => ({
  title: 'Income and Expense Report', subtitle: '2026-11-01 to 2026-11-30', summary: [['Income', 'Rs 100'], ['Expenses', 'Rs 40'], ['Net', 'Rs 60'], ['Outstanding', 'Rs 5,000']],
  tables: [{ title: 'By day', columns: [{ label: 'Date', width: 3 }, { label: 'Income', width: 2, align: 'right' }], rows: Array.from({ length: rows }, (_, i) => [`2026-11-${String((i % 28) + 1).padStart(2, '0')}`, `Rs ${i}`]), footer: ['Total', 'Rs 1'] }],
})

describe('renderReportPdf', () => {
  it('makes a valid PDF', async () => {
    const bytes = await renderReportPdf(data(5))
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe('%PDF')
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
  })
  it('flows a long table onto more pages', async () => {
    expect((await PDFDocument.load(await renderReportPdf(data(120)))).getPageCount()).toBeGreaterThan(1)
  })
  it('shows an empty table without breaking', async () => {
    expect((await PDFDocument.load(await renderReportPdf(data(0)))).getPageCount()).toBe(1)
  })
})

describe('finance date helpers', () => {
  it('finds the first of the month', () => expect(firstOfMonth('2026-11-17')).toBe('2026-11-01'))
  it('computes month ranges including leap February', () => {
    expect(monthRange(2026, 11)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(monthRange(2028, 2)).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})
