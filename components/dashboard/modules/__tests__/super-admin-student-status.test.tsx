import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setStatus = vi.fn()
vi.mock('@/lib/actions/students', () => ({ setStudentStatusAction: (i: unknown) => setStatus(i), deleteStudentAction: vi.fn() }))
vi.mock('@/lib/actions/student-summary', () => ({ fetchStudentAcademicSummaryAction: vi.fn().mockResolvedValue({ ok: true, attendancePct: 90, avgScore: 70 }) }))
vi.mock('@/lib/actions/parents', () => ({ setParentPasswordAction: vi.fn() }))
vi.mock('@/components/dashboard/SetPasswordModal', () => ({ default: () => null }))
vi.mock('@/components/dashboard/StudentSubjectsSection', () => ({ default: () => null }))
vi.mock('@/components/dashboard/ReportDownloadButton', () => ({ default: () => null }))
vi.mock('@/components/dashboard/StudentIdCard', () => ({ default: () => null }))

import SuperAdminStudentDirectoryContent, { type DirectoryStudent } from '../SuperAdminStudentDirectoryContent'

const student = (i: number, status: 'Active' | 'Inactive' = 'Active'): DirectoryStudent => ({
  id: `00000000-0000-4000-8000-00000000000${i}`, roll_number: `9G1-0${i}`, registration_number: `R-${i}`, full_name: `Student ${i}`,
  grade: '9', section: 'G1', program: 'SSC-1', status, enrollment_date: '2026-08-01', is_late_enrollment: false,
  parent_id: null, parent_name: 'Parent', parent_email: null, parent_phone: '0300 1111111', guardian_profession: null, previous_school: null,
  last_qualification: null, address: null, gr_number: `GR-${1000 + i}`, registration_fee: null, tuition_fee: 4000, stream: null, fee_status: 'unpaid',
})

const open = (name: string) => fireEvent.click(screen.getByText(name))
// the name also shows in the open side panel, so find the one inside the table row
const rowOf = (name: string) => screen.getAllByText(name).map((el) => el.closest('tr')).find((tr): tr is HTMLTableRowElement => !!tr)!

beforeEach(() => {
  setStatus.mockReset()
  setStatus.mockResolvedValue({ ok: true })
})
afterEach(cleanup)

describe('Super Admin: mark a student inactive or active again', () => {
  it('offers "Mark student inactive" for an active student and explains that nothing is deleted', () => {
    render(<SuperAdminStudentDirectoryContent students={[student(1)]} grades={['9']} />)
    open('Student 1')
    fireEvent.click(screen.getByRole('button', { name: /mark student inactive/i }))
    const dialog = screen.getByRole('dialog', { name: 'Mark student inactive' })
    expect(within(dialog).getByText(/Nothing is deleted/)).toBeTruthy()
    expect(within(dialog).getByText(/attendance, marks entry, fee lists/)).toBeTruthy()
    expect(setStatus).not.toHaveBeenCalled() // asking first
  })

  it('cancelling changes nothing', () => {
    render(<SuperAdminStudentDirectoryContent students={[student(1)]} grades={['9']} />)
    open('Student 1')
    fireEvent.click(screen.getByRole('button', { name: /mark student inactive/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Mark student inactive' })).toBeNull()
    expect(setStatus).not.toHaveBeenCalled()
  })

  it('confirming sends the change for that student and shows them as Inactive straight away', async () => {
    render(<SuperAdminStudentDirectoryContent students={[student(1), student(2)]} grades={['9']} />)
    open('Student 2')
    fireEvent.click(screen.getByRole('button', { name: /mark student inactive/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Mark inactive' }))
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000000002', status: 'inactive' }))
    await screen.findByRole('button', { name: /make student active again/i })
    expect(within(rowOf('Student 2')).getByText('Inactive')).toBeTruthy()
    expect(within(rowOf('Student 1')).getByText('Active')).toBeTruthy()
  })

  it('an inactive student can be made active again, at any time', async () => {
    render(<SuperAdminStudentDirectoryContent students={[student(1, 'Inactive')]} grades={['9']} />)
    open('Student 1')
    fireEvent.click(screen.getByRole('button', { name: /make student active again/i }))
    expect(screen.getByText(/with all their history intact/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Make active' }))
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000000001', status: 'active' }))
    await screen.findByRole('button', { name: /mark student inactive/i })
  })

  it('an inactive student still has the Edit details link', () => {
    render(<SuperAdminStudentDirectoryContent students={[student(1, 'Inactive')]} grades={['9']} />)
    open('Student 1')
    const edit = screen.getByText('Edit student details').closest('a')!
    expect(edit.getAttribute('href')).toBe('/super-admin/admissions/9/G1')
  })

  it('a failure is shown in the dialog and the student keeps their status', async () => {
    setStatus.mockResolvedValue({ ok: false, error: 'Not authorized.' })
    render(<SuperAdminStudentDirectoryContent students={[student(1)]} grades={['9']} />)
    open('Student 1')
    fireEvent.click(screen.getByRole('button', { name: /mark student inactive/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Mark inactive' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Not authorized.'))
    expect(within(rowOf('Student 1')).getByText('Active')).toBeTruthy()
  })

  it('the Inactive filter finds the students who have been set inactive', () => {
    render(<SuperAdminStudentDirectoryContent students={[student(1), student(2, 'Inactive')]} grades={['9']} />)
    fireEvent.change(screen.getByDisplayValue('All Statuses'), { target: { value: 'Inactive' } })
    expect(screen.queryByText('Student 1')).toBeNull()
    expect(screen.getByText('Student 2')).toBeTruthy()
  })
})
