import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const enrol = vi.fn()
vi.mock('@/lib/actions/enrol-student', () => ({ enrolStudentAction: (input: unknown) => enrol(input) }))

import AdmissionsNewStudentContent from '../AdmissionsNewStudentContent'

const field = (container: HTMLElement, name: string) => container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
const set = (el: HTMLInputElement, value: string) => fireEvent.change(el, { target: { value } })

// Fills every required input with a value, then the three phone fields explicitly.
function fillForm(container: HTMLElement, phones: { primary: string; secondary?: string; whatsapp2?: string }) {
  container.querySelectorAll<HTMLInputElement>('input[required]').forEach((el, i) => set(el, `value ${i}`))
  set(field(container, 'parent-primary-phone'), phones.primary)
  set(field(container, 'parent-secondary-phone'), phones.secondary ?? '')
  set(field(container, 'parent-whatsapp-2'), phones.whatsapp2 ?? '')
}

beforeEach(() => {
  enrol.mockReset()
  enrol.mockResolvedValue({ ok: true, rollNumber: '9-A-001', registrationNumber: 'R-1', parentAccountType: 'new', username: 'parent.one', tempPassword: 'Temp-1234' })
})
afterEach(cleanup)

describe('enrolment form — one student must never inherit the previous family\'s numbers', () => {
  it('"Enrol Another" clears the primary, second phone and WhatsApp 2 numbers', async () => {
    const { container } = render(<AdmissionsNewStudentContent />)
    fillForm(container, { primary: '0300 1111111', secondary: '0311 2222222', whatsapp2: '0322 3333333' })
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(screen.getByText('Enrol Another')).toBeTruthy())

    fireEvent.click(screen.getByText('Enrol Another'))
    expect(field(container, 'parent-primary-phone').value).toBe('')
    expect(field(container, 'parent-secondary-phone').value).toBe('')
    expect(field(container, 'parent-whatsapp-2').value).toBe('')
  })

  it('the second enrolment sends only what was typed for it', async () => {
    const { container } = render(<AdmissionsNewStudentContent />)
    fillForm(container, { primary: '0300 1111111', secondary: '0311 2222222', whatsapp2: '0322 3333333' })
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(enrol).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('Enrol Another')).toBeTruthy())
    fireEvent.click(screen.getByText('Enrol Another'))

    fillForm(container, { primary: '0344 9999999' })
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(enrol).toHaveBeenCalledTimes(2))
    const second = enrol.mock.calls[1]![0] as { parentPhone: string; parentSecondaryPhone?: string; parentWhatsapp2?: string }
    expect(second.parentPhone).toBe('0344 9999999')
    expect(second.parentSecondaryPhone).toBeUndefined()
    expect(second.parentWhatsapp2).toBeUndefined()
  })

  it('the phone fields opt out of browser autofill, so a saved number cannot slip in', () => {
    const { container } = render(<AdmissionsNewStudentContent />)
    for (const name of ['parent-primary-phone', 'parent-secondary-phone', 'parent-whatsapp-2']) {
      expect(field(container, name).getAttribute('autocomplete')).toBe('off')
    }
  })
})
