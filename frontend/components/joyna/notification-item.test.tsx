import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { NotificationRow, type AppNotification } from './notification-item'

function renderRow(notification: AppNotification) {
  return render(
    <MemoryRouter>
      <NotificationRow notification={notification} />
    </MemoryRouter>,
  )
}

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
    const { container } = renderRow(makeNotification({ isRead: false }))

    expect(container.querySelector('.bg-joyna-coral')).toBeInTheDocument()
  })

  it('shows no dot for a read notification', () => {
    const { container } = renderRow(makeNotification({ isRead: true }))

    expect(container.querySelector('.bg-joyna-coral')).not.toBeInTheDocument()
  })

  it('describes an event invite', () => {
    renderRow(makeNotification({ type: 'event_invite', actorName: 'Alan Turing' }))

    expect(screen.getByText('Alan Turing invited you to an event')).toBeInTheDocument()
  })

  it('describes an accepted invite response', () => {
    renderRow(makeNotification({ type: 'invite_response', status: 'accepted', actorName: 'Margaret' }))

    expect(screen.getByText('Margaret joined the event')).toBeInTheDocument()
  })

  it('describes a declined invite response', () => {
    renderRow(makeNotification({ type: 'invite_response', status: 'declined', actorName: 'Margaret' }))

    expect(screen.getByText("Margaret can't make it")).toBeInTheDocument()
  })

  it('describes an event update without needing an actor', () => {
    renderRow(makeNotification({ type: 'event_updated', actorName: undefined }))

    expect(screen.getByText('Event details were updated')).toBeInTheDocument()
  })

  it('describes an rsvp deadline reminder without needing an actor', () => {
    renderRow(makeNotification({ type: 'rsvp_deadline_reminder', actorName: undefined }))

    expect(screen.getByText('RSVP deadline is tomorrow')).toBeInTheDocument()
  })

  it('describes an event starting today without needing an actor', () => {
    renderRow(makeNotification({ type: 'event_starting_today', actorName: undefined }))

    expect(screen.getByText('This event is happening today')).toBeInTheDocument()
  })

  it('links to the event and shows an arrow when the notification has an event', () => {
    renderRow(makeNotification({ eventId: 'event-1' }))

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/events/event-1')
    expect(link.querySelector('svg')).toBeInTheDocument()
  })

  it('is not a link and shows no arrow when the notification has no event', () => {
    renderRow(makeNotification({ eventId: undefined }))

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
