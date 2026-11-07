import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES, OLD_EXCEL_MESSAGE, WRONG_TYPE_MESSAGE, checkFileNameAndSize, tooLargeMessage, uploadFailureMessage } from '../limits'

describe('checkFileNameAndSize', () => {
  it('lets Excel and CSV files through, whatever the capitals', () => {
    expect(checkFileNameAndSize('results.xlsx', 1000)).toBeNull()
    expect(checkFileNameAndSize('RESULTS.XLSX', 1000)).toBeNull()
    expect(checkFileNameAndSize('marks.csv', 1000)).toBeNull()
  })

  it('answers an old .xls file with the exact steps to convert it', () => {
    const msg = checkFileNameAndSize('results.xls', 1000)
    expect(msg).toBe(OLD_EXCEL_MESSAGE)
    expect(msg).toMatch(/Save As/)
    expect(msg).toMatch(/\.xlsx/)
  })

  it('refuses other file types and empty files', () => {
    expect(checkFileNameAndSize('photo.png', 1000)).toBe(WRONG_TYPE_MESSAGE)
    expect(checkFileNameAndSize('notes.txt', 1000)).toBe(WRONG_TYPE_MESSAGE)
    expect(checkFileNameAndSize('marks.csv', 0)).toBe('The file is empty.')
  })

  it('says how big the file is and what the limit is when it is too large', () => {
    const msg = checkFileNameAndSize('big.xlsx', MAX_UPLOAD_BYTES + 1)!
    expect(msg).toBe(tooLargeMessage(MAX_UPLOAD_BYTES + 1))
    expect(msg).toMatch(/limit is 4 MB/)
    expect(checkFileNameAndSize('exact.xlsx', MAX_UPLOAD_BYTES)).toBeNull()
  })

  it('keeps the limit under the hosting platform request cap (4.5 MB)', () => {
    expect(MAX_UPLOAD_BYTES).toBeLessThan(4.5 * 1024 * 1024)
  })
})

describe('uploadFailureMessage', () => {
  it('prefers the server\'s own message', () => {
    expect(uploadFailureMessage(400, { error: 'Choose the exam.' })).toBe('Choose the exam.')
  })
  it('explains the common failures when the server gave no message', () => {
    expect(uploadFailureMessage(413, null)).toMatch(/too large/)
    expect(uploadFailureMessage(401, null)).toMatch(/signed out/)
    expect(uploadFailureMessage(403, null)).toMatch(/not allowed/)
    expect(uploadFailureMessage(504, null)).toMatch(/too long/)
    expect(uploadFailureMessage(500, null)).toMatch(/error 500/)
    expect(uploadFailureMessage(418, null)).toMatch(/error 418/)
  })
})
