import { describe, expect, it } from 'vitest'
import { absenceAlertMessage, gradeAlertMessage } from '../message-templates'

describe('parent message formats', () => {
  it('absence notice matches the school-supplied wording exactly', () => {
    expect(absenceAlertMessage('Ayesha Khan', '9B15', '2026-10-02')).toBe(
      'Notification of Absence.\n\nDear Parents,\nAyesha Khan, having GR# 9B15, is absent today (2 October 2026). Kindly ensure they cover the missed work.\n\nRegards,\nJ.E Academy.',
    )
  })

  it('result notice uses the same formal layout with the GR number and score', () => {
    expect(gradeAlertMessage('Ayesha Khan', '9B15', 'PHYSICS', 'Chapter 4 Quiz', 45, 50)).toBe(
      'Notification of Result.\n\nDear Parents,\nAyesha Khan, having GR# 9B15, has scored 45/50 in PHYSICS (Chapter 4 Quiz).\n\nRegards,\nJ.E Academy.',
    )
  })

  it('no message contains carriage returns (they would render oddly in WhatsApp/SMS)', () => {
    expect(absenceAlertMessage('A', '1', '2026-01-01')).not.toContain('\r')
    expect(gradeAlertMessage('A', '1', 'S', 'E', 1, 2)).not.toContain('\r')
  })
})
