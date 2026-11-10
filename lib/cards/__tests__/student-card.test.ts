// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'
import { ACADEMY_PHONE, gradeLabel, orDash, sessionLabel, truncateToWidth, wrapText } from '../card-data'
import { COLLEGE_GROUPS, MATRIC_GROUPS, groupsForGrade, isGroupForGrade } from '../groups'
import { renderStudentCardPdf, renderStudentCardsPdf } from '../student-card'

// A neutral head-and-shoulders silhouette (never a real person's face).
async function silhouette(): Promise<Uint8Array> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720"><rect width="600" height="720" fill="#cfd6df"/><circle cx="300" cy="290" r="110" fill="#8d99aa"/><ellipse cx="300" cy="650" rx="210" ry="190" fill="#8d99aa"/></svg>`
  return new Uint8Array(await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer())
}

describe('card helpers', () => {
  it('grade is printed in Roman numerals, as on the school card', () => {
    expect(gradeLabel('9')).toBe('IX')
    expect(gradeLabel('10')).toBe('X')
    expect(gradeLabel('11')).toBe('XI')
    expect(gradeLabel('12')).toBe('XII')
    expect(gradeLabel('ICOM-1')).toBe('I.COM-I')
    expect(gradeLabel('ICOM-2')).toBe('I.COM-II')
    expect(gradeLabel('Prep')).toBe('Prep')
  })

  it('session is the enrolment year and the next, two digits each', () => {
    expect(sessionLabel(2026)).toBe('26/27')
    expect(sessionLabel(2009)).toBe('09/10')
    expect(sessionLabel(2099)).toBe('99/00')
  })

  it('wraps to a width without losing words', () => {
    const lines = wrapText('This card is non-transferable and must be used by the student only.', 60, (s) => s.length * 2)
    expect(lines.join(' ')).toBe('This card is non-transferable and must be used by the student only.')
    expect(lines.every((l) => l.length * 2 <= 60 || !l.includes(' '))).toBe(true)
  })
})

describe('card text helpers', () => {
  it('an empty value prints as a dash', () => {
    expect(orDash('')).toBe('—')
    expect(orDash('   ')).toBe('—')
    expect(orDash(null)).toBe('—')
    expect(orDash(' 0300 ')).toBe('0300')
  })
  it('truncates with an ellipsis only when it does not fit', () => {
    const measure = (s: string) => s.length * 2
    expect(truncateToWidth('short', 40, measure)).toBe('short')
    const cut = truncateToWidth('A very long parent name indeed', 40, measure)
    expect(cut.endsWith('…')).toBe(true)
    expect(measure(cut)).toBeLessThanOrEqual(40)
  })
})

describe('renderStudentCardPdf', () => {
  const base = {
    fullName: 'Ayesha Fatima', parentName: 'Imran Khan', registrationNumber: 'REG-2026-0501',
    grNumber: 'FA 501', gradeLabel: 'IX', section: 'B1', group: 'Biology', session: '26/27',
  }

  it('produces a two-page card at the school design size', async () => {
    const bytes = await renderStudentCardPdf({ ...base, photoJpeg: await silhouette() })
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(2)
    const { width, height } = doc.getPage(0).getSize()
    expect(width).toBeCloseTo(141.75, 2)
    expect(height).toBeCloseTo(240.75, 2)
    if (process.env.CARD_OUT) writeFileSync(`${process.env.CARD_OUT}-photo.pdf`, bytes)
  })

  it('prints father, group and registration, and copes when they are missing or very long', async () => {
    const full = await renderStudentCardPdf({ ...base, photoJpeg: null })
    expect((await PDFDocument.load(full)).getPageCount()).toBe(2)
    const empty = await renderStudentCardPdf({ ...base, parentName: '', group: '', registrationNumber: '', photoJpeg: null })
    expect((await PDFDocument.load(empty)).getPageCount()).toBe(2)
    const long = await renderStudentCardPdf({ ...base, parentName: 'Muhammad Abdullah Bin Abdul Rehman Siddiqui Al-Hashmi', group: 'Pre-Engineering', photoJpeg: null })
    expect((await PDFDocument.load(long)).getPageCount()).toBe(2)
    if (process.env.CARD_OUT) writeFileSync(`${process.env.CARD_OUT}-fields.pdf`, full)
  })

  it('bulk: every student gets a front and a back page, in order', async () => {
    const cards = [1, 2, 3].map((n) => ({ ...base, fullName: `Student ${n}`, photoJpeg: null }))
    const doc = await PDFDocument.load(await renderStudentCardsPdf(cards))
    expect(doc.getPageCount()).toBe(6)
    expect(doc.getTitle()).toBe('Student ID Cards (3)')
    for (let i = 0; i < 6; i++) expect(doc.getPage(i).getSize().width).toBeCloseTo(141.75, 2)
  })

  it('works without a photo (placeholder frame)', async () => {
    const bytes = await renderStudentCardPdf({ ...base, photoJpeg: null })
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2)
    if (process.env.CARD_OUT) writeFileSync(`${process.env.CARD_OUT}-nophoto.pdf`, bytes)
  })

  it('copes with a very long name (shrinks, then wraps) and with unsupported characters', async () => {
    const long = await renderStudentCardPdf({ ...base, fullName: 'Muhammad Abdullah Bin Abdul Rehman Siddiqui Al-Hashmi', photoJpeg: null })
    expect((await PDFDocument.load(long)).getPageCount()).toBe(2)
    const urdu = await renderStudentCardPdf({ ...base, fullName: 'عائشہ فاطمہ', photoJpeg: null })
    expect((await PDFDocument.load(urdu)).getPageCount()).toBe(2)
    if (process.env.CARD_OUT) writeFileSync(`${process.env.CARD_OUT}-longname.pdf`, long)
  })

  // -- what the card actually says, read back out of the PDF --------------------------------------------------
  async function pageText(bytes: Uint8Array, pageNo: number): Promise<string> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise
    const page = await doc.getPage(pageNo)
    const content = await page.getTextContent()
    return content.items.map((i) => ('str' in i ? i.str : '')).join(' ').replace(/\s+/g, ' ')
  }

  it('the front says Father and Group (with their values) and no longer prints a contact number', async () => {
    const text = await pageText(await renderStudentCardPdf({ ...base, photoJpeg: null }), 1)
    expect(text).toMatch(/Father/)
    expect(text).toMatch(/Imran Khan/)
    expect(text).toMatch(/Group/)
    expect(text).toMatch(/Biology/)
    expect(text).not.toMatch(/Contact/)
    expect(text).not.toMatch(/Parent/)
    expect(text).toMatch(/JE ACADEMY/)
    expect(text).toMatch(/SCIENCE & COMMERCE/)
  })

  it('a college student is printed with their college group', async () => {
    const text = await pageText(await renderStudentCardPdf({ ...base, gradeLabel: 'XI', group: 'Pre-Medical', photoJpeg: null }), 1)
    expect(text).toMatch(/Pre-Medical/)
  })

  it('the back carries the academy name, the note and the academy phone number beneath it', async () => {
    const text = await pageText(await renderStudentCardPdf({ ...base, photoJpeg: null }), 2)
    expect(ACADEMY_PHONE).toBe('+92 343 3773203')
    expect(text).toMatch(/JE ACADEMY/)
    expect(text).toMatch(/NOTE: FINDER/)
    expect(text.indexOf(ACADEMY_PHONE)).toBeGreaterThan(text.indexOf('NOTE: FINDER'))
  })

  it('the logo is stamped on both pages: the small brand logo and the large watermark', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await renderStudentCardPdf({ ...base, photoJpeg: null })), useSystemFonts: true }).promise
    for (const n of [1, 2]) {
      const ops = await (await doc.getPage(n)).getOperatorList()
      const images = ops.fnArray.filter((fn) => fn === pdfjs.OPS.paintImageXObject).length
      expect(images).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('card groups', () => {
  it('classes 9 and 10 choose Biology or Engineering; 11, 12 and I.Com choose from the four college groups', () => {
    expect([...groupsForGrade('9')]).toEqual([...MATRIC_GROUPS])
    expect([...groupsForGrade('10')]).toEqual(['Biology', 'Engineering'])
    for (const g of ['11', '12', 'ICOM-1', 'ICOM-2']) expect([...groupsForGrade(g)]).toEqual([...COLLEGE_GROUPS])
    expect([...COLLEGE_GROUPS]).toEqual(['Pre-Engineering', 'Pre-Medical', 'General Science', 'Commerce'])
  })

  it('a group only fits the classes it belongs to', () => {
    expect(isGroupForGrade('9', 'Biology')).toBe(true)
    expect(isGroupForGrade('9', 'Commerce')).toBe(false)
    expect(isGroupForGrade('11', 'Biology')).toBe(false)
    expect(isGroupForGrade('11', 'General Science')).toBe(true)
    expect(isGroupForGrade('12', '')).toBe(false)
    expect(isGroupForGrade('9', 'Pre-Medical')).toBe(false)
  })
})
