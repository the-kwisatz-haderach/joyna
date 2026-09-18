import { render, screen, within } from '@testing-library/react'
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

  it('shows events the user is hosting under Your events', async () => {
    loginAsMockUser()
    renderEvents()

    const heading = await screen.findByRole('heading', { name: /your events/i })
    const section = heading.closest('div')?.parentElement as HTMLElement
    const link = await within(section).findByRole('link', { name: /summer rooftop party/i })
    expect(link).toHaveAttribute('href', '/events/c1a2b3c4-1111-4a1a-8a1a-000000000001')
  })

  it('shows events the user is invited to under Upcoming', async () => {
    loginAsMockUser()
    renderEvents()

    const heading = await screen.findByRole('heading', { name: /^upcoming$/i })
    const section = heading.closest('div')?.parentElement as HTMLElement
    const link = await within(section).findByRole('link', { name: /turing award dinner/i })
    expect(link).toHaveAttribute('href', '/events/c1a2b3c4-1111-4a1a-8a1a-000000000004')
  })

  it('shows dimmed past events under Past events', async () => {
    loginAsMockUser()
    renderEvents()

    const heading = await screen.findByRole('heading', { name: /past events/i })
    const section = heading.closest('div')?.parentElement as HTMLElement
    const link = await within(section).findByRole('link', { name: /welcome mixer/i })
    expect(link).toHaveAttribute('href', '/events/c1a2b3c4-1111-4a1a-8a1a-000000000003')
  })
})
