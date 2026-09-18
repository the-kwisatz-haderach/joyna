import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import Events from './events'

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

function renderEvents() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/events']}>
        <Routes>
          <Route path="/events" element={<Events />} />
          <Route path="/events/all" element={<div>All events screen</div>} />
          <Route path="/events/:id" element={<div>Event detail</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('Events', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('shows a "View all" link to the paginated events screen', async () => {
    loginAsMockUser()
    renderEvents()

    const link = await screen.findByRole('link', { name: /view all/i })
    expect(link).toHaveAttribute('href', '/events/all')
  })

  it('marks an event the user is hosting with a host badge', async () => {
    loginAsMockUser()
    renderEvents()

    const link = await screen.findByRole('link', { name: /board game night/i })
    expect(within(link).getByLabelText('Hosting')).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/events/c1a2b3c4-1111-4a1a-8a1a-000000000002')
  })

  it('marks an accepted invite with an attending badge', async () => {
    loginAsMockUser()
    renderEvents()

    const link = await screen.findByRole('link', { name: /quiz night/i })
    expect(within(link).getByLabelText('Attending')).toBeInTheDocument()
  })

  it('hides hosted events when the Hosting filter is toggled off', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEvents()

    await screen.findByRole('link', { name: /board game night/i })

    await user.click(screen.getByRole('button', { name: 'Hosting' }))

    expect(screen.queryByRole('link', { name: /board game night/i })).not.toBeInTheDocument()
    // Invited-to events (Hosting is now off, Invited stays on) still show.
    expect(await screen.findByRole('link', { name: /turing award dinner/i })).toBeInTheDocument()
  })
})
