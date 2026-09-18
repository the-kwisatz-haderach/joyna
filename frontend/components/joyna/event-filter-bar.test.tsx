import { describe, expect, it } from 'vitest'

import { DEFAULT_EVENT_FILTERS, matchesEventFilters, type EventFilters } from './event-filter-bar'

describe('matchesEventFilters', () => {
  it('defaults to showing both hosted and invited events', () => {
    expect(DEFAULT_EVENT_FILTERS).toEqual({ hosting: true, invited: true, rsvpDeadline: false })
  })

  it('matches hosted events only when Hosting is on and Invited is off', () => {
    const filters: EventFilters = { hosting: true, invited: false, rsvpDeadline: false }
    expect(matchesEventFilters({ isOwner: true }, filters)).toBe(true)
    expect(matchesEventFilters({ isOwner: false }, filters)).toBe(false)
  })

  it('matches invited events only when Invited is on and Hosting is off', () => {
    const filters: EventFilters = { hosting: false, invited: true, rsvpDeadline: false }
    expect(matchesEventFilters({ isOwner: false }, filters)).toBe(true)
    expect(matchesEventFilters({ isOwner: true }, filters)).toBe(false)
  })

  it('matches events with an RSVP deadline regardless of ownership, when toggled on', () => {
    const filters: EventFilters = { hosting: false, invited: false, rsvpDeadline: true }
    expect(matchesEventFilters({ isOwner: true, rsvpDeadline: '2026-01-01' }, filters)).toBe(true)
    expect(matchesEventFilters({ isOwner: false, rsvpDeadline: '2026-01-01' }, filters)).toBe(true)
    expect(matchesEventFilters({ isOwner: false }, filters)).toBe(false)
  })

  it('shows nothing when every filter is off', () => {
    const filters: EventFilters = { hosting: false, invited: false, rsvpDeadline: false }
    expect(matchesEventFilters({ isOwner: true, rsvpDeadline: '2026-01-01' }, filters)).toBe(false)
  })
})
