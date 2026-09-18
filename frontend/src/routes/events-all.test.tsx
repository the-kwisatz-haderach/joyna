import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import AllEvents from './events-all'

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

function renderAllEvents() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/events/all']}>
        <Routes>
          <Route path="/events/all" element={<AllEvents />} />
          <Route path="/events/:id" element={<div>Event detail</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('AllEvents', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('shows the heading and paginates results 10 per page', async () => {
    loginAsMockUser()
    renderAllEvents()

    await screen.findByRole('heading', { name: /all events/i })
    expect(await screen.findByRole('button', { name: '2' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(10)
  })

  it('filters events by search text', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderAllEvents()

    await screen.findByRole('heading', { name: /all events/i })
    await user.type(screen.getByLabelText(/search events/i), 'quiz')

    const link = await screen.findByRole('link', { name: /quiz night/i })
    expect(link).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /board game night/i })).not.toBeInTheDocument()
  })

  it('fades past events', async () => {
    loginAsMockUser()
    renderAllEvents()

    // "Coffee Catchup" is 20 days in the past but still lands on page 1.
    const link = await screen.findByRole('link', { name: /coffee catchup/i })
    expect(link.className).toMatch(/opacity-60/)
  })

  it('shows only declined invites when the Not attending filter is selected', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderAllEvents()

    await screen.findByRole('heading', { name: /all events/i })
    await user.click(screen.getByRole('radio', { name: 'Not attending' }))

    expect(await screen.findByRole('link', { name: /new year kickoff/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
