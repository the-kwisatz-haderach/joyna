import {render, screen, waitFor, within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach, describe, expect, it} from 'vitest'

import {AuthProvider} from '../auth-context'
import {mockUsers} from '../mocks/data'
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
      screen.queryByRole('navigation', {name: 'Primary'}),
    ).not.toBeInTheDocument()
  })

  it('shows the current screen title and app navigation for logged in users', () => {
    loginAsMockUser()

    renderRootLayout(['/events'])

    const topMenu = within(screen.getByRole('banner'))
    expect(topMenu.getByText('Events')).toBeInTheDocument()
    expect(topMenu.getByRole('link', {name: /notifications/i})).toHaveAttribute(
      'href',
      '/notifications',
    )
    expect(topMenu.getByRole('link', {name: /^profile$/i})).toHaveAttribute(
      'href',
      '/profile',
    )

    const bottomMenu = within(screen.getByRole('navigation', {name: 'Primary'}))
    expect(bottomMenu.getByRole('link', {name: /^events$/i})).toHaveAttribute(
      'href',
      '/events',
    )
    expect(bottomMenu.getByRole('link', {name: /^network$/i})).toHaveAttribute(
      'href',
      '/network',
    )
    expect(
      bottomMenu.getByRole('link', {name: /create event/i}),
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
    const backLink = topMenu.getByRole('link', {name: /events/i})
    expect(backLink).toHaveAttribute('href', '/events')
    expect(backLink.querySelector('svg')).toBeInTheDocument()
    expect(backLink).not.toHaveTextContent('<')
    expect(
      screen.queryByRole('navigation', {name: 'Primary'}),
    ).not.toBeInTheDocument()
  })

  it('hides the create event button outside of the events listing screen', () => {
    loginAsMockUser()

    renderRootLayout(['/network'])

    const bottomMenu = within(screen.getByRole('navigation', {name: 'Primary'}))
    expect(
      bottomMenu.queryByRole('link', {name: /create event/i}),
    ).not.toBeInTheDocument()
  })

  it('shows the create event button on the root events listing route', () => {
    loginAsMockUser()

    renderRootLayout(['/'])

    const bottomMenu = within(screen.getByRole('navigation', {name: 'Primary'}))
    expect(
      bottomMenu.getByRole('link', {name: /create event/i}),
    ).toHaveAttribute('href', '/events/new')
  })

  it('shows an unread badge on the notifications icon when there are unread notifications', async () => {
    loginAsMockUser()

    renderRootLayout(['/events'])

    const topMenu = within(screen.getByRole('banner'))
    expect(
      await topMenu.findByRole('link', {name: /notifications \(unread\)/i}),
    ).toBeInTheDocument()
  })

  it('hides the unread badge while on the notifications screen', async () => {
    loginAsMockUser()

    renderRootLayout(['/notifications'])

    const topMenu = within(screen.getByRole('banner'))
    await waitFor(() => {
      expect(
        topMenu.getByRole('link', {name: /^notifications$/i}),
      ).toBeInTheDocument()
    })
  })

  it('links to the manage network screen from the network route', () => {
    loginAsMockUser()

    renderRootLayout(['/network'])

    const bottomMenu = within(screen.getByRole('navigation', {name: 'Primary'}))
    expect(
      bottomMenu.getByRole('link', {name: /manage/i}),
    ).toHaveAttribute('href', '/network/manage')
  })

  it('shows a "Network" back link and hides the bottom nav on the manage network route', () => {
    loginAsMockUser()

    renderRootLayout(['/network/manage'])

    const topMenu = within(screen.getByRole('banner'))
    const backLink = topMenu.getByRole('link', {name: /network/i})
    expect(backLink).toHaveAttribute('href', '/network')
    expect(
      screen.queryByRole('navigation', {name: 'Primary'}),
    ).not.toBeInTheDocument()
  })

  it('shows a "Network" back link and hides the bottom nav on the add-by-email route', () => {
    loginAsMockUser()

    renderRootLayout(['/network/add'])

    const topMenu = within(screen.getByRole('banner'))
    const backLink = topMenu.getByRole('link', {name: /network/i})
    expect(backLink).toHaveAttribute('href', '/network')
    expect(
      screen.queryByRole('navigation', {name: 'Primary'}),
    ).not.toBeInTheDocument()
  })

  it('shows a "Profile" back link and hides the bottom nav on the edit profile route', () => {
    loginAsMockUser()

    renderRootLayout(['/profile/edit'])

    const header = screen.getByRole('banner')
    const backLink = header.querySelector('a[href="/profile"]:not([aria-label])')
    expect(backLink).not.toBeNull()
    expect(backLink).toHaveTextContent('Profile')
    expect(
      screen.queryByRole('navigation', {name: 'Primary'}),
    ).not.toBeInTheDocument()
  })

  it('shows the profile nav button as active on the edit profile route', () => {
    loginAsMockUser()

    renderRootLayout(['/profile/edit'])

    const accountNav = within(screen.getByRole('navigation', {name: 'Account'}))
    const profileLink = accountNav.getByRole('link', {name: /^profile$/i})
    expect(profileLink.className).toMatch(/bg-joyna-ink/)
  })

  it('shows the bottom nav with an active but clickable Events link on the all events route', () => {
    loginAsMockUser()

    renderRootLayout(['/events/all'])

    const bottomMenu = within(screen.getByRole('navigation', {name: 'Primary'}))
    const eventsLink = bottomMenu.getByRole('link', {name: /^events$/i})
    expect(eventsLink).toHaveAttribute('href', '/events')
    expect(eventsLink.className).toMatch(/bg-joyna-ink/)
  })
})
