import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NotificationRow, type AppNotification } from './notification-item'

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: '1',
    type: 'event_invite',
    eventName: 'Summer Rooftop Party',
    actorName: 'Alan Turing',
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('NotificationRow', () => {
  it('shows an unread dot for an unread notification', () => {
    const { container } = render(<NotificationRow notification={makeNotification({ isRead: false })} />)

    expect(container.querySelector('.bg-joyna-coral')).toBeInTheDocument()
  })

  it('shows no dot for a read notification', () => {
    const { container } = render(<NotificationRow notification={makeNotification({ isRead: true })} />)

    expect(container.querySelector('.bg-joyna-coral')).not.toBeInTheDocument()
  })

  it('describes an event invite', () => {
    render(<NotificationRow notification={makeNotification({ type: 'event_invite', actorName: 'Alan Turing' })} />)

    expect(screen.getByText('Alan Turing invited you to an event')).toBeInTheDocument()
  })

  it('describes an accepted invite response', () => {
    render(
      <NotificationRow
        notification={makeNotification({ type: 'invite_response', status: 'accepted', actorName: 'Margaret' })}
      />,
    )

    expect(screen.getByText('Margaret joined the event')).toBeInTheDocument()
  })

  it('describes a declined invite response', () => {
    render(
      <NotificationRow
        notification={makeNotification({ type: 'invite_response', status: 'declined', actorName: 'Margaret' })}
      />,
    )

    expect(screen.getByText("Margaret can't make it")).toBeInTheDocument()
  })

  it('describes an event update without needing an actor', () => {
    render(<NotificationRow notification={makeNotification({ type: 'event_updated', actorName: undefined })} />)

    expect(screen.getByText('Event details were updated')).toBeInTheDocument()
  })

  it('describes an rsvp deadline reminder', () => {
    render(
      <NotificationRow notification={makeNotification({ type: 'rsvp_deadline_reminder', actorName: undefined })} />,
    )

    expect(screen.getByText('RSVP deadline is tomorrow')).toBeInTheDocument()
  })

  it('describes an event starting today reminder', () => {
    render(
      <NotificationRow notification={makeNotification({ type: 'event_starting_today', actorName: undefined })} />,
    )

    expect(screen.getByText('This event takes place today')).toBeInTheDocument()
  })
})
