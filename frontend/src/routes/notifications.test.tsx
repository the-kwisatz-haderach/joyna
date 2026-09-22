import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import type { AppNotification } from '../../components/joyna/notification-item'
import { server } from '../mocks/node'
import Notifications from './notifications'

// Defined inline (rather than reusing src/mocks/data.ts) so each test's
// expectations don't depend on the shared mock server's mark-as-read side
// effect having (or not having) already run for an earlier test in this file.
const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'event_invite',
    eventId: 'event-1',
    eventName: 'Turing Award Dinner',
    actorId: 'actor-1',
    actorName: 'Alan Turing',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n2',
    type: 'event_updated',
    eventId: 'event-2',
    eventName: 'Team Offsite',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n3',
    type: 'invite_response',
    eventId: 'event-3',
    eventName: 'Rooftop Movie Night',
    actorId: 'actor-1',
    actorName: 'Alan Turing',
    status: 'declined',
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n4',
    type: 'invite_response',
    eventId: 'event-4',
    eventName: 'Summer Rooftop Party',
    actorId: 'actor-2',
    actorName: 'Margaret Hamilton',
    status: 'accepted',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
]

function mockNotificationsResponse(
  notifications: AppNotification[],
  { totalPages = 1 }: { totalPages?: number } = {},
) {
  server.use(
    http.get('/api/notifications', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page')) || 1
      return HttpResponse.json({
        notifications,
        page,
        pageSize: 30,
        totalCount: notifications.length,
        totalPages,
      })
    }),
  )
}

function renderNotifications() {
  return render(
    <MemoryRouter>
      <Notifications />
    </MemoryRouter>,
  )
}

describe('Notifications', () => {
  it('renders the all-caught-up empty state when there are none', async () => {
    mockNotificationsResponse([])

    renderNotifications()

    expect(
      await screen.findByRole('heading', { name: /you.re all caught up/i }),
    ).toBeInTheDocument()
  })

  it('lists a notification with its event, description and relative time', async () => {
    mockNotificationsResponse(SAMPLE_NOTIFICATIONS)

    renderNotifications()

    expect(await screen.findByText('Turing Award Dinner')).toBeInTheDocument()
    expect(screen.getByText('Alan Turing invited you to an event')).toBeInTheDocument()
    expect(screen.getByText('2h ago')).toBeInTheDocument()
  })

  it('differentiates read and unread notifications', async () => {
    mockNotificationsResponse(SAMPLE_NOTIFICATIONS)

    renderNotifications()
    await screen.findByText('Turing Award Dinner')

    expect(screen.getByText('Turing Award Dinner').className).toMatch(/font-semibold/)
    expect(screen.getByText('Team Offsite').className).toMatch(/font-medium/)
  })

  it('describes a declined invite response', async () => {
    mockNotificationsResponse(SAMPLE_NOTIFICATIONS)

    renderNotifications()

    expect(await screen.findByText("Alan Turing can't make it")).toBeInTheDocument()
  })

  it('describes an accepted invite response as joining the event', async () => {
    mockNotificationsResponse(SAMPLE_NOTIFICATIONS)

    renderNotifications()

    expect(await screen.findByText('Margaret Hamilton joined the event')).toBeInTheDocument()
  })

  it('links each notification to its event', async () => {
    mockNotificationsResponse(SAMPLE_NOTIFICATIONS)

    renderNotifications()
    await screen.findByText('Turing Award Dinner')

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/events/event-1',
      '/events/event-2',
      '/events/event-3',
      '/events/event-4',
    ])
  })

  it('hides pagination when there is only one page', async () => {
    mockNotificationsResponse(SAMPLE_NOTIFICATIONS, { totalPages: 1 })

    renderNotifications()
    await screen.findByText('Turing Award Dinner')

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('shows pagination and requests the next page on click', async () => {
    const user = userEvent.setup()
    let requestedPage = 1
    server.use(
      http.get('/api/notifications', ({ request }) => {
        requestedPage = Number(new URL(request.url).searchParams.get('page')) || 1
        return HttpResponse.json({
          notifications: SAMPLE_NOTIFICATIONS,
          page: requestedPage,
          pageSize: 30,
          totalCount: 60,
          totalPages: 2,
        })
      }),
    )

    renderNotifications()
    await screen.findByText('Turing Award Dinner')

    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => expect(requestedPage).toBe(2))
  })
})
