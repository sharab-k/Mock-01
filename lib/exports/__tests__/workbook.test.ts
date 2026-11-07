// @vitest-environment node
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { buildWorkbook } from '../workbook'

const load = async (buf: Buffer) => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as ArrayBuffer)
  return wb
}

describe('buildWorkbook', () => {
  const columns = [
    { header: 'Sr', key: 'serial', width: 6 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Contact', key: 'contact', width: 16 },
    { header: 'Status', key: 'status', width: 10 },
  ]

  it('writes a header row and one row per record, with filters and a frozen header', async () => {
    const wb = await load(await buildWorkbook({
      title: 'Students', sheetName: '9 G1', columns,
      rows: [{ serial: 1, name: 'Ali Raza', contact: '0300 1111111', status: 'Active' }, { serial: 2, name: 'Sana', contact: null, status: 'Inactive' }],
    }))
    const ws = wb.getWorksheet('9 G1')!
    expect(ws.getRow(1).values).toEqual([undefined, 'Sr', 'Name', 'Contact', 'Status'])
    expect(ws.getRow(2).values).toEqual([undefined, 1, 'Ali Raza', '0300 1111111', 'Active'])
    expect(ws.getRow(3).getCell(3).value).toBe('') // a missing value is an empty cell, never "null"
    expect(ws.rowCount).toBe(3)
    expect(ws.autoFilter).toBeTruthy()
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
  })

  it('keeps a value that starts with = or + as plain text, never a formula', async () => {
    const wb = await load(await buildWorkbook({ title: 'x', sheetName: 'S', columns, rows: [{ serial: 1, name: '=HYPERLINK("http://evil")', contact: '+92 300 1234567', status: 'Active' }] }))
    const row = wb.getWorksheet('S')!.getRow(2)
    expect(row.getCell(2).type).toBe(ExcelJS.ValueType.String)
    expect(row.getCell(2).value).toBe('=HYPERLINK("http://evil")')
    expect(row.getCell(3).value).toBe('+92 300 1234567')
  })

  it('cleans up a sheet name Excel would reject', async () => {
    const wb = await load(await buildWorkbook({ title: 'x', sheetName: 'Oct/Nov: [9] G1?*' + 'x'.repeat(40), columns, rows: [] }))
    const name = wb.worksheets[0]!.name
    expect(name.length).toBeLessThanOrEqual(31)
    expect(name).not.toMatch(/[\\/*?:[\]]/)
  })

  it('applies per-cell fills', async () => {
    const wb = await load(await buildWorkbook({
      title: 'x', sheetName: 'S', columns, rows: [{ serial: 1, name: 'A', contact: '', status: 'Active' }],
      fill: (r, key) => (key === 'status' ? 'FFEAF5F0' : undefined),
    }))
    const fill = wb.getWorksheet('S')!.getRow(2).getCell(4).fill as ExcelJS.FillPattern
    expect(fill.fgColor?.argb).toBe('FFEAF5F0')
  })
})
