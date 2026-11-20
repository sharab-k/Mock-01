import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { grKey, idKey, normalizeHeader, parseDate, pick } from '../sheet'

describe('parseDate (how schools actually write dates)', () => {
  it.each([
    ['2026-10-03', '2026-10-03'],
    ['2026-1-3', '2026-01-03'],
    ['03/10/2026', '2026-10-03'], // day-first, as written in Pakistan
    ['3-10-2026', '2026-10-03'],
    ['3.10.2026', '2026-10-03'],
    ['15/09/2026', '2026-09-15'],
    ['3 Oct 2026', '2026-10-03'],
    ['2026-10-03T00:00:00.000Z', '2026-10-03'],
  ])('%s -> %s', (raw, expected) => {
    expect(parseDate(raw)).toBe(expected)
  })

  it.each(['', '   ', 'soon', '31/02/2026', '2026-13-01', '00/10/2026', '2026-02-30'])('rejects %j', (raw) => {
    expect(parseDate(raw)).toBeNull()
  })
})

describe('header and id normalisation', () => {
  it('matches column titles regardless of case, spaces and punctuation', () => {
    expect(normalizeHeader('GR No.')).toBe('grno')
    expect(normalizeHeader(' Exam Date ')).toBe('examdate')
    expect(normalizeHeader('Total Marks')).toBe('totalmarks')
  })

  it('treats "N 101", "N101" and "n  101 " as the same GR number', () => {
    expect(grKey('N 101')).toBe(grKey('N101'))
    expect(grKey('N 101')).toBe(grKey(' n  101 '))
  })

  it('collapses roll-number whitespace and case', () => {
    expect(idKey(' ICOM-1E1 ')).toBe('icom-1e1')
  })

  it('pick returns the first filled alias', () => {
    expect(pick({ score: '', marks: '42' }, ['marks', 'score'])).toBe('42')
    expect(pick({}, ['marks'])).toBe('')
  })
})

describe('readWorkbook: a file whose Excel "tables" the reader cannot parse', () => {
  // The client's result sheet carries a table with no header row (Table_1, B46:B48), which the Excel reader crashes on.
  async function fileWithHeaderlessTable(): Promise<File> {
    const ExcelJS = (await import('exceljs')).default
    const JSZip = (await import('jszip')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('xi a')
    ws.addRow(['Sr #', 'Gr #', 'Name of students'])
    ws.addRow([1, 'FA 501', 'Javeria Shahzad'])
    const zip = await JSZip.loadAsync(Buffer.from(await wb.xlsx.writeBuffer()))
    zip.file('xl/tables/table1.xml', '<table id="1" name="Table_1" displayName="Table_1" ref="B2:B3" headerRowCount="0" xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><tableColumns count="1"><tableColumn id="1" name="Column1"/></tableColumns><tableStyleInfo name="xi a-style" showFirstColumn="1" showLastColumn="1" showRowStripes="1" showColumnStripes="0"/></table>')
    zip.file('xl/worksheets/_rels/sheet1.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="/xl/tables/table1.xml" Id="rId1"/></Relationships>')
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    zip.file('xl/worksheets/sheet1.xml', sheetXml.replace('</worksheet>', '<tableParts count="1"><tablePart xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></tableParts></worksheet>'))
    const ct = await zip.file('[Content_Types].xml')!.async('string')
    zip.file('[Content_Types].xml', ct.replace('</Types>', '<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>'))
    return new File([new Uint8Array(await zip.generateAsync({ type: 'nodebuffer' }))], 'result.xlsx')
  }

  it('still reads every cell', async () => {
    const { readWorkbook } = await import('../sheet')
    const res = await readWorkbook(await fileWithHeaderlessTable())
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.sheets[0].rows[1]).toEqual(['1', 'FA 501', 'Javeria Shahzad'])
  })
})
