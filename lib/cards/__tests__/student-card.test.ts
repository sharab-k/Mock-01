// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'
import { gradeLabel, sessionLabel, wrapText } from '../card-data'
import { renderStudentCardPdf } from '../student-card'

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

describe('renderStudentCardPdf', () => {
  const base = { fullName: 'Ayesha Fatima', grNumber: 'FA 501', gradeLabel: 'IX', section: 'B1', session: '26/27' }

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
})
