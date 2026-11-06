import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { renderVouchersPdf, type VoucherData } from '../voucher-pdf'

const base: VoucherData = {
  voucherNo: 101, studentName: 'Ahmed Ali Khan', grNumber: 'GR-2201', rollNumber: '11-A-014', grade: '11', section: 'A',
  periodLabel: 'November 2026', dueDate: '2026-11-10',
  lines: [{ label: 'Tuition', amount: 6000 }, { label: 'Examination', amount: 500 }], discount: 500, total: 6000, paid: 2000, outstanding: 4000, statusLabel: 'Partially paid',
}

describe('renderVouchersPdf', () => {
  it('makes one landscape page per voucher', async () => {
    const bytes = await renderVouchersPdf([base, { ...base, voucherNo: 102 }, { ...base, voucherNo: 103 }])
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe('%PDF')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(3)
    const { width, height } = doc.getPage(0).getSize()
    expect(width).toBeGreaterThan(height)
  })

  it('copes with a very long name, no GR number and many fee lines', async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ label: `Fee head number ${i + 1} with a rather long description`, amount: 100 + i }))
    const bytes = await renderVouchersPdf([{ ...base, studentName: 'Muhammad Abdul Rahman Siddiqui Al-Farooqi Junior', grNumber: null, lines: many }])
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
  })
})
