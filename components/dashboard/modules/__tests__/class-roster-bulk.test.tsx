import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const submit = vi.fn()
const markOne = vi.fn()
vi.mock('@/lib/actions/attendance', () => ({
  submitClassAttendanceAction: (i: unknown) => submit(i),
  markAttendanceAction: (i: unknown) => markOne(i),
}))
vi.mock('@/lib/actions/notifications', () => ({ sendAbsenceAlertAction: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/attendance/9/G1' }))

import AttendanceClassDetailContent, { type RosterStudent } from '../AttendanceClassDetailContent'

const student = (i: number, status: RosterStudent['status'] = 'unmarked'): RosterStudent => ({
  id: `00000000-0000-4000-8000-00000000000${i}`, name: `Student ${i}`, roll: `9G1-0${i}`, gr: `GR-${1000 + i}`, grade: '9', section: 'G1',
  status, parentPhone: null, hasParent: false, alertStatus: null, termAttendance: { present: 0, absent: 0, late: 0, total: 0 },
})

const classDate = '2026-11-06'
const renderClass = (students: RosterStudent[]) => render(<AttendanceClassDetailContent grade="9" section="G1" students={students} classDate={classDate} />)
const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

beforeEach(() => {
  submit.mockReset(); markOne.mockReset()
  submit.mockResolvedValue({ ok: true, notifiedCount: 0 })
  markOne.mockResolvedValue({ ok: true, notified: false })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('class roster layout and quick toggles', () => {
  it('shows serial number, GR number, then the name', () => {
    renderClass([student(1), student(2)])
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers.slice(0, 3)).toEqual(['#', 'GR No.', 'Name'])
    const cells = within(rowOf('Student 2')).getAllByRole('cell').map((c) => c.textContent)
    expect(cells[0]).toBe('2')
    expect(cells[1]).toBe('GR-1002')
  })

  it('All Present marks the whole class in one request, with no prompt when nobody was marked', async () => {
    renderClass([student(1), student(2), student(3)])
    fireEvent.click(screen.getByText('All Present'))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    const call = submit.mock.calls[0]![0] as { records: { status: string }[]; classDate: string }
    expect(call.records).toHaveLength(3)
    expect(call.records.every((r) => r.status === 'present')).toBe(true)
    expect(call.classDate).toBe(classDate)
    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('All Absent asks first, then marks everyone absent', async () => {
    renderClass([student(1), student(2)])
    fireEvent.click(screen.getByText('All Absent'))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('parents will be notified'))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect((submit.mock.calls[0]![0] as { records: { status: string }[] }).records.every((r) => r.status === 'absent')).toBe(true)
  })

  it('cancelling the prompt changes nothing', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderClass([student(1), student(2)])
    fireEvent.click(screen.getByText('All Absent'))
    await Promise.resolve()
    expect(submit).not.toHaveBeenCalled()
  })

  it('All Present asks before overwriting students who were already marked, and skips ones already present', async () => {
    renderClass([student(1, 'present'), student(2, 'absent'), student(3, 'late')])
    fireEvent.click(screen.getByText('All Present'))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('already marked'))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect((submit.mock.calls[0]![0] as { records: { studentName: string }[] }).records.map((r) => r.studentName)).toEqual(['Student 2', 'Student 3'])
  })

  it('a failed bulk save puts every status back and says why', async () => {
    submit.mockResolvedValue({ ok: false, error: 'Not authorized.' })
    renderClass([student(1), student(2)])
    fireEvent.click(screen.getByText('All Present'))
    await waitFor(() => expect(screen.getByText('Not authorized.')).toBeTruthy())
    expect(within(rowOf('Student 1')).getAllByText('Unmarked').length).toBeGreaterThan(0)
  })

  it('after All Present, ticking Absent overrides one student and leaves the rest', async () => {
    renderClass([student(1), student(2), student(3)])
    fireEvent.click(screen.getByText('All Present'))
    await waitFor(() => expect(submit).toHaveBeenCalled())
    fireEvent.click(within(rowOf('Student 2')).getByLabelText('Mark Student 2 absent'))
    await waitFor(() => expect(markOne).toHaveBeenCalledTimes(1))
    expect(markOne).toHaveBeenCalledWith(expect.objectContaining({ studentName: 'Student 2', status: 'absent', classDate }))
    expect(within(rowOf('Student 1')).getAllByText('Present').length).toBeGreaterThan(0)
    expect(within(rowOf('Student 3')).getAllByText('Present').length).toBeGreaterThan(0)
  })
})
