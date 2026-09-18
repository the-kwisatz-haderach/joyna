import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import EditEvent from './edit-event'

const OWNED_EVENT_ID = 'c1a2b3c4-1111-4a1a-8a1a-000000000001'

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

function renderEditEvent(eventId: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/events/${eventId}/edit`]}>
        <Routes>
          <Route path="/events" element={<div>Events list</div>} />
          <Route path="/events/:id/edit" element={<EditEvent />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('EditEvent', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('asks for confirmation before cancelling the event, and backs out on "Go back"', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEditEvent(OWNED_EVENT_ID)

    await screen.findByDisplayValue(/summer rooftop party/i)

    await user.click(screen.getByRole('button', { name: /cancel event/i }))

    expect(screen.getByRole('heading', { name: /cancelling event/i })).toBeInTheDocument()
    expect(
      screen.getByText(/this notifies all guests and can't be undone/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /go back/i }))

    expect(
      screen.queryByRole('heading', { name: /cancelling event/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByDisplayValue(/summer rooftop party/i)).toBeInTheDocument()
  })

  it('cancels the event and navigates to the events list on "Confirm"', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEditEvent(OWNED_EVENT_ID)

    await screen.findByDisplayValue(/summer rooftop party/i)

    await user.click(screen.getByRole('button', { name: /cancel event/i }))
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.getByText(/events list/i)).toBeInTheDocument()
    })
  })
})
