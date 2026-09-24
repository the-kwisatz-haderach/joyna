import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { EventCard, type EventListItem } from './event-card'

function makeEvent(overrides: Partial<EventListItem> = {}): EventListItem {
  return {
    id: 'e1',
    ownerId: 'owner-1',
    name: 'Board game night',
    description: '',
    date: '2026-09-14T18:00:00Z',
    location: "Sven's place",
    isOwner: false,
    ...overrides,
  }
}

function renderCard(event: EventListItem) {
  return render(
    <MemoryRouter>
      <EventCard event={event} />
    </MemoryRouter>,
  )
}

describe('EventCard', () => {
  it('shows the host icon inside the trailing circle for a hosted event, with the sunflower tone', () => {
    const link = renderCard(makeEvent({ isOwner: true })).getByRole('link')

    expect(within(link).getByLabelText('Hosting')).toBeInTheDocument()
    expect(link).toHaveClass('border-joyna-sunflower', 'bg-white')
  })

  it('shows a green checkmark for an accepted invite, with the default border and white background', () => {
    const link = renderCard(makeEvent({ viewerInviteStatus: 'accepted' })).getByRole('link')

    expect(within(link).getByLabelText('Attending')).toBeInTheDocument()
    expect(within(link).queryByLabelText('Hosting')).not.toBeInTheDocument()
    expect(link).toHaveClass('border-joyna-border', 'bg-white')
  })

  it('shows a red cross for a declined invite, with the default border and white background', () => {
    const link = renderCard(makeEvent({ viewerInviteStatus: 'declined' })).getByRole('link')

    expect(within(link).getByLabelText('Not attending')).toBeInTheDocument()
    expect(link).toHaveClass('border-joyna-border', 'bg-white')
  })

  it('falls back to the "view" arrow when the invite is still pending', () => {
    const { getByRole, queryByLabelText } = renderCard(
      makeEvent({ viewerInviteStatus: 'pending' }),
    )

    expect(queryByLabelText('Hosting')).not.toBeInTheDocument()
    expect(queryByLabelText('Attending')).not.toBeInTheDocument()
    expect(queryByLabelText('Not attending')).not.toBeInTheDocument()
    expect(getByRole('link')).toHaveClass('border-joyna-border', 'bg-white')
  })
})
