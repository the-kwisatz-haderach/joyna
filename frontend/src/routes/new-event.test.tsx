import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import NewEvent from './new-event'

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

function BlankStub() {
  const location = useLocation()
  const template = (location.state as { template?: { name: string } } | null)?.template
  return <div>Blank form{template ? ` for ${template.name}` : ''}</div>
}

function renderNewEvent() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/events/new']}>
        <Routes>
          <Route path="/events/new" element={<NewEvent />} />
          <Route path="/events/new/blank" element={<BlankStub />} />
          <Route path="/events/templates" element={<div>Manage templates screen</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('NewEvent', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('always shows the "Empty event" option', async () => {
    loginAsMockUser()
    renderNewEvent()

    expect(await screen.findByRole('button', { name: /empty event/i })).toBeInTheDocument()
  })

  it('lists the user\'s templates with a Manage link', async () => {
    loginAsMockUser()
    renderNewEvent()

    expect(await screen.findByRole('button', { name: /afterwork today/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /movie night/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage/i })).toHaveAttribute('href', '/events/templates')
  })

  it('navigates to the blank form with no template state when "Empty event" is clicked', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderNewEvent()

    await user.click(await screen.findByRole('button', { name: /empty event/i }))

    expect(await screen.findByText('Blank form')).toBeInTheDocument()
  })

  it('navigates to the blank form with the chosen template in state', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderNewEvent()

    await user.click(await screen.findByRole('button', { name: /afterwork today/i }))

    expect(await screen.findByText('Blank form for Afterwork today')).toBeInTheDocument()
  })
})
