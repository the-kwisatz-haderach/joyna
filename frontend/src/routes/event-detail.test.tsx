import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import EventDetail from './event-detail'

function loginAsMockUser() {
  localStorage.setItem(
    'joyna.currentUser',
    JSON.stringify({
      id: mockUsers[0].id,
      name: mockUsers[0].name,
      email: mockUsers[0].email,
      joinedAt: mockUsers[0].joinedAt,
    }),
  )
}

function renderEventDetail(eventId: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/events/${eventId}`]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('EventDetail', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('shows event details, an Edit details link, and the guest list for the owner', async () => {
    loginAsMockUser()
    renderEventDetail('c1a2b3c4-1111-4a1a-8a1a-000000000001')

    expect(
      await screen.findByRole('heading', { name: /summer rooftop party/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/downtown rooftop, stockholm/i)).toBeInTheDocument()
    expect(
      screen.getByText(/drinks and music under the stars/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/party mood/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /edit details/i }),
    ).toHaveAttribute('href', '/events/c1a2b3c4-1111-4a1a-8a1a-000000000001/edit')

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(await screen.findByText('Margaret Hamilton')).toBeInTheDocument()
  })

  it('lets an invited user accept the invite', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEventDetail('c1a2b3c4-1111-4a1a-8a1a-000000000004')

    expect(
      await screen.findByRole('heading', { name: /turing award dinner/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /edit details/i }),
    ).not.toBeInTheDocument()

    const yesButton = screen.getByRole('button', { name: /^yes$/i })
    await user.click(yesButton)

    expect(
      await screen.findByRole('button', { name: /^no$/i }),
    ).toBeInTheDocument()
  })

  it('shows a not-found message for an event the viewer cannot access', async () => {
    loginAsMockUser()
    renderEventDetail('00000000-0000-0000-0000-000000000000')

    expect(await screen.findByText(/event not found/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /back to events/i }),
    ).toHaveAttribute('href', '/events')
  })
})
