import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/dashboard/StudentIdCard', () => ({ default: () => null }))

import StudentCardsContent, { type CardStudent } from '../StudentCardsContent'

const student = (i: number, grade: string, group: string | null): CardStudent => ({
  id: `00000000-0000-4000-8000-00000000000${i}`, full_name: `Student ${i}`, gr_number: `GR-${i}`, roll_number: `R-${i}`,
  grade, section: 'A', status: 'Active', fee_status: 'unpaid', card_group: group,
})

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement
const groupSelect = (name: string) => within(rowOf(name)).getByLabelText(`Group for ${name}`) as HTMLSelectElement

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const students = [student(1, '9', 'Biology'), student(2, '9', null), student(3, '11', null), student(4, '12', 'Commerce')]

describe('Super Admin cards list: Group column', () => {
  it('shows each student\'s group, and offers only the options for their class', () => {
    render(<StudentCardsContent students={students} grades={['9', '11', '12']} />)
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeTruthy()
    expect(groupSelect('Student 1').value).toBe('Biology')
    expect(Array.from(groupSelect('Student 1').options).map((o) => o.value)).toEqual(['Biology', 'Engineering'])
    expect(groupSelect('Student 4').value).toBe('Commerce')
    expect(Array.from(groupSelect('Student 3').options).map((o) => o.value)).toEqual(['', 'Pre-Engineering', 'Pre-Medical', 'General Science', 'Commerce'])
    expect(groupSelect('Student 3').value).toBe('')
  })

  it('choosing a group saves it for that student and shows it straight away', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, group: 'Pre-Medical' }))
    vi.stubGlobal('fetch', fetchMock)
    render(<StudentCardsContent students={students} grades={['9', '11', '12']} />)
    fireEvent.change(groupSelect('Student 3'), { target: { value: 'Pre-Medical' } })
    await waitFor(() => expect(groupSelect('Student 3').value).toBe('Pre-Medical'))
    expect(fetchMock).toHaveBeenCalledWith('/api/students/00000000-0000-4000-8000-000000000003/group', expect.objectContaining({ method: 'POST', body: JSON.stringify({ group: 'Pre-Medical' }) }))
  })

  it('a failed save shows the reason and leaves the group empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Could not save the group.' }, { status: 500 })))
    render(<StudentCardsContent students={students} grades={['9', '11', '12']} />)
    fireEvent.change(groupSelect('Student 2'), { target: { value: 'Engineering' } })
    await waitFor(() => expect(screen.getByText('Could not save the group.')).toBeTruthy())
    expect(groupSelect('Student 2').value).toBe('')
  })

  it('a bulk download without groups is refused: the message names who needs one and their rows are marked', async () => {
    const missing = [{ id: students[1]!.id, name: 'Student 2', roll: 'R-2' }, { id: students[2]!.id, name: 'Student 3', roll: 'R-3' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ code: 'group_required', error: '2 students have no group chosen yet. Choose their group first.', missing }, { status: 409 })))
    render(<StudentCardsContent students={students} grades={['9', '11', '12']} />)
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    const alert = await screen.findByText(/have no group chosen yet/)
    expect(alert.textContent).toMatch(/Student 2, Student 3/)
    expect(alert.textContent).toMatch(/Then download again/)
    expect(groupSelect('Student 2').className).toMatch(/border-danger/)
    expect(groupSelect('Student 3').className).toMatch(/border-danger/)
    expect(groupSelect('Student 1').className).not.toMatch(/border-danger/)
  })

  it('choosing a group for a marked student clears its mark', async () => {
    const missing = [{ id: students[1]!.id, name: 'Student 2', roll: 'R-2' }]
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'group_required', error: '1 student has no group chosen yet.', missing }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ ok: true, group: 'Biology' }))
    vi.stubGlobal('fetch', fetchMock)
    render(<StudentCardsContent students={students} grades={['9', '11', '12']} />)
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    await screen.findByText(/no group chosen yet/)
    fireEvent.change(groupSelect('Student 2'), { target: { value: 'Biology' } })
    await waitFor(() => expect(groupSelect('Student 2').value).toBe('Biology'))
    expect(groupSelect('Student 2').className).not.toMatch(/border-danger/)
  })
})
