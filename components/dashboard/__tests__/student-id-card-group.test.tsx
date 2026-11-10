import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/dashboard/CardPreview', () => ({ default: ({ pdf }: { pdf: ArrayBuffer | null }) => <div data-testid="preview">{pdf ? 'card-ready' : 'card-loading'}</div> }))

import StudentIdCard from '../StudentIdCard'

type Info = { group: string | null; options: string[]; canChange: boolean }
const MATRIC = ['Biology', 'Engineering']

let info: Info
let cardStatus = 200
const calls: { url: string; method: string; body?: string }[] = []

function installFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })
    if (url.endsWith('/photo')) return new Response(null, { status: 404 })
    if (url.endsWith('/group') && (init?.method ?? 'GET') === 'GET') return Response.json(info)
    if (url.endsWith('/group')) {
      const { group } = JSON.parse(init!.body as string)
      info = { ...info, group, canChange: info.canChange }
      return Response.json({ ok: true, group })
    }
    if (url.endsWith('/card')) {
      if (cardStatus !== 200) return Response.json({ code: 'group_required', error: 'Choose the group.' }, { status: cardStatus })
      return new Response(new Uint8Array([37, 80, 68, 70]), { status: 200, headers: { 'Content-Disposition': 'attachment; filename="id-card-X.pdf"' } })
    }
    return new Response(null, { status: 404 })
  }))
}

const open = (role: 'parent' | 'super_admin') => {
  render(<StudentIdCard studentId="s1" studentName="Ayesha" role={role} />)
  fireEvent.click(screen.getByRole('button', { name: /id card/i }))
}
const cardCalls = () => calls.filter((c) => c.url.endsWith('/card'))

beforeEach(() => {
  calls.length = 0
  cardStatus = 200
  info = { group: null, options: MATRIC, canChange: true }
  installFetch()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('ID card panel: the group comes first', () => {
  it('with no group chosen it asks for one, offers the class options, and shows no card yet', async () => {
    open('parent')
    await screen.findByText(/Choose the group first/)
    const section = screen.getByTestId('group-section')
    expect(within(section).getAllByRole('radio').map((r) => r.textContent)).toEqual(MATRIC)
    expect(screen.getByText(/Choose the group above to see the card/)).toBeTruthy()
    expect((screen.getByRole('button', { name: /download card/i }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /print/i }) as HTMLButtonElement).disabled).toBe(true)
    expect(cardCalls()).toHaveLength(0) // the card is not even requested
  })

  it('a parent is told the choice can be made only once, and Save stays off until one is picked', async () => {
    open('parent')
    await screen.findByText(/choose the group only one time/i)
    expect((screen.getByRole('button', { name: /save group/i }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Engineering' }))
    expect((screen.getByRole('button', { name: /save group/i }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('saving the group sends it, then shows the card and enables Download and Print', async () => {
    open('parent')
    await screen.findByText(/Choose the group first/)
    fireEvent.click(screen.getByRole('radio', { name: 'Biology' }))
    fireEvent.click(screen.getByRole('button', { name: /save group/i }))
    await waitFor(() => expect(screen.getByTestId('preview').textContent).toBe('card-ready'))
    expect(calls.find((c) => c.url.endsWith('/group') && c.method === 'POST')?.body).toBe(JSON.stringify({ group: 'Biology' }))
    expect((screen.getByRole('button', { name: /download card/i }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: /print/i }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('a parent whose group is already set sees it read-only, with who to ask to change it', async () => {
    info = { group: 'Biology', options: MATRIC, canChange: false }
    open('parent')
    await waitFor(() => expect(screen.getByTestId('preview').textContent).toBe('card-ready'))
    const section = screen.getByTestId('group-section')
    expect(within(section).getByText('Biology')).toBeTruthy()
    expect(within(section).getByText(/contact the academy office/)).toBeTruthy()
    expect(within(section).queryByRole('combobox')).toBeNull()
  })

  it('a Super Admin can change the group at any time, and the card is rebuilt with it', async () => {
    info = { group: 'Biology', options: MATRIC, canChange: true }
    open('super_admin')
    await waitFor(() => expect(screen.getByTestId('preview').textContent).toBe('card-ready'))
    const select = within(screen.getByTestId('group-section')).getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('Biology')
    const before = cardCalls().length
    fireEvent.change(select, { target: { value: 'Engineering' } })
    await waitFor(() => expect(cardCalls().length).toBe(before + 1))
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/group'))?.body).toBe(JSON.stringify({ group: 'Engineering' }))
  })

  it('if the server says a group is needed after all, the panel goes back to asking for one', async () => {
    info = { group: 'Biology', options: MATRIC, canChange: false }
    cardStatus = 409
    open('parent')
    await screen.findByText(/Choose the group first/)
    expect((screen.getByRole('button', { name: /download card/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('a failed save shows the reason and keeps asking', async () => {
    open('parent')
    await screen.findByText(/Choose the group first/)
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/group') && init?.method === 'POST') return Response.json({ error: 'The group has already been chosen. Ask the academy office to change it.' }, { status: 500 })
      if (url.endsWith('/photo')) return new Response(null, { status: 404 })
      return Response.json(info)
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Biology' }))
    fireEvent.click(screen.getByRole('button', { name: /save group/i }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/already been chosen/))
    expect((screen.getByRole('button', { name: /download card/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})
