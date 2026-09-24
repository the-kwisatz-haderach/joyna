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

  it('shows a Templates section above the events list with a Manage link', async () => {
    loginAsMockUser()
    renderEvents()

    expect(await screen.findByRole('button', { name: /afterwork today/i })).toBeInTheDocument()
    const manageLink = screen.getByRole('link', { name: /manage/i })
    expect(manageLink).toHaveAttribute('href', '/events/templates')
  })

  it('marks an event the user is hosting with a host badge', async () => {
    loginAsMockUser()
    renderEvents()

    const link = await screen.findByRole('link', { name: /board game night/i })
    expect(within(link).getByLabelText('Hosting')).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/events/c1a2b3c4-1111-4a1a-8a1a-000000000002')
  })

  it('shows a green checkmark for an accepted invite, with the default card tone', async () => {
    loginAsMockUser()
    renderEvents()

    const link = await screen.findByRole('link', { name: /quiz night/i })
    expect(within(link).getByLabelText('Attending')).toBeInTheDocument()
    expect(link).toHaveClass('border-joyna-border', 'bg-white')
  })

  it('shows a red cross for a declined invite, with the default card tone', async () => {
    loginAsMockUser()
    renderEvents()

    const link = await screen.findByRole('link', { name: /new year kickoff/i })
    expect(within(link).getByLabelText('Not attending')).toBeInTheDocument()
    expect(link).toHaveClass('border-joyna-border', 'bg-white')
  })

  it('shows only hosted events when the Hosting filter is selected', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEvents()

    await screen.findByRole('link', { name: /board game night/i })

    await user.click(screen.getByRole('radio', { name: 'Hosting' }))

    expect(await screen.findByRole('link', { name: /board game night/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /turing award dinner/i })).not.toBeInTheDocument()
  })

  it('shows only invited events when the Invites filter is selected', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEvents()

    await screen.findByRole('link', { name: /board game night/i })

    await user.click(screen.getByRole('radio', { name: 'Invites' }))

    expect(await screen.findByRole('link', { name: /turing award dinner/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /board game night/i })).not.toBeInTheDocument()
  })

  it('shows only invited events with an RSVP deadline when Has deadline is selected', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEvents()

    await screen.findByRole('link', { name: /board game night/i })

    await user.click(screen.getByRole('radio', { name: 'Has deadline' }))

    expect(await screen.findByRole('link', { name: /team offsite/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /board game night/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /turing award dinner/i })).not.toBeInTheDocument()
  })

  it('shows hosted and accepted-invite events when Attending is selected', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEvents()

    await screen.findByRole('link', { name: /board game night/i })

    await user.click(screen.getByRole('radio', { name: 'Attending' }))

    expect(await screen.findByRole('link', { name: /board game night/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /quiz night/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /turing award dinner/i })).not.toBeInTheDocument()
  })

  it('shows only declined invites when Not attending is selected', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEvents()

    await screen.findByRole('link', { name: /board game night/i })

    await user.click(screen.getByRole('radio', { name: 'Not attending' }))

    expect(await screen.findByRole('link', { name: /new year kickoff/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /board game night/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /quiz night/i })).not.toBeInTheDocument()
  })

  it('filters are mutually exclusive, only one is checked at a time', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEvents()

    await screen.findByRole('link', { name: /board game night/i })

    await user.click(screen.getByRole('radio', { name: 'Hosting' }))
    expect(screen.getByRole('radio', { name: 'Hosting' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'false')

    await user.click(screen.getByRole('radio', { name: 'Invites' }))
    expect(screen.getByRole('radio', { name: 'Invites' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Hosting' })).toHaveAttribute('aria-checked', 'false')
  })
})
