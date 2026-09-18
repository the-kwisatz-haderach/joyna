import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import RootLayout from './root-layout'

function renderRootLayout(initialEntries: string[] = ['/']) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <RootLayout />
      </MemoryRouter>
    </AuthProvider>,
  )
}

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

describe('RootLayout', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('renders no app chrome for guests', () => {
    renderRootLayout()

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Primary' }),
    ).not.toBeInTheDocument()
  })

  it('shows the current screen title and app navigation for logged in users', () => {
    loginAsMockUser()

    renderRootLayout(['/events'])

    const topMenu = within(screen.getByRole('banner'))
    expect(topMenu.getByText('Events')).toBeInTheDocument()
    expect(topMenu.getByRole('link', { name: /notifications/i })).toHaveAttribute(
      'href',
      '/notifications',
    )
    expect(topMenu.getByRole('link', { name: /^profile$/i })).toHaveAttribute(
      'href',
      '/profile',
    )

    const bottomMenu = within(screen.getByRole('navigation', { name: 'Primary' }))
    expect(bottomMenu.getByRole('link', { name: /^events$/i })).toHaveAttribute(
      'href',
      '/events',
    )
    expect(bottomMenu.getByRole('link', { name: /^network$/i })).toHaveAttribute(
      'href',
      '/network',
    )
    expect(
      bottomMenu.getByRole('link', { name: /create event/i }),
    ).toHaveAttribute('href', '/events/new')
  })

  it('updates the screen title based on the current route', () => {
    loginAsMockUser()

    renderRootLayout(['/notifications'])

    const topMenu = within(screen.getByRole('banner'))
    expect(topMenu.getByText('Notifications')).toBeInTheDocument()
  })

  it('shows a back button and hides the bottom nav on the event detail route', () => {
    loginAsMockUser()

    renderRootLayout(['/events/c1a2b3c4-1111-4a1a-8a1a-000000000001'])

    const topMenu = within(screen.getByRole('banner'))
    expect(topMenu.getByRole('link', { name: /back to events/i })).toHaveAttribute(
      'href',
      '/events',
    )
    expect(
      screen.queryByRole('navigation', { name: 'Primary' }),
    ).not.toBeInTheDocument()
  })
})
