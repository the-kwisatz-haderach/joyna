import { describe, expect, it } from 'vitest'

import { DEFAULT_EVENT_FILTER, matchesEventFilter } from './event-filter-bar'

describe('matchesEventFilter', () => {
  it('defaults to showing everything', () => {
    expect(DEFAULT_EVENT_FILTER).toBe('all')
  })

  it('"all" matches every event', () => {
    expect(matchesEventFilter({ isOwner: true }, 'all')).toBe(true)
    expect(matchesEventFilter({ isOwner: false }, 'all')).toBe(true)
  })

  it('"hasDeadline" matches only invited events with an RSVP deadline', () => {
    expect(
      matchesEventFilter({ isOwner: false, rsvpDeadline: '2026-01-01' }, 'hasDeadline'),
    ).toBe(true)
    expect(matchesEventFilter({ isOwner: false }, 'hasDeadline')).toBe(false)
    expect(
      matchesEventFilter({ isOwner: true, rsvpDeadline: '2026-01-01' }, 'hasDeadline'),
    ).toBe(false)
  })

  it('"invites" matches events the user isn\'t hosting', () => {
    expect(matchesEventFilter({ isOwner: false }, 'invites')).toBe(true)
    expect(matchesEventFilter({ isOwner: true }, 'invites')).toBe(false)
  })

  it('"hosting" matches events the user is hosting', () => {
    expect(matchesEventFilter({ isOwner: true }, 'hosting')).toBe(true)
    expect(matchesEventFilter({ isOwner: false }, 'hosting')).toBe(false)
  })

  it('"attending" matches hosted events and accepted invites', () => {
    expect(matchesEventFilter({ isOwner: true }, 'attending')).toBe(true)
    expect(
      matchesEventFilter({ isOwner: false, viewerInviteStatus: 'accepted' }, 'attending'),
    ).toBe(true)
    expect(
      matchesEventFilter({ isOwner: false, viewerInviteStatus: 'pending' }, 'attending'),
    ).toBe(false)
    expect(
      matchesEventFilter({ isOwner: false, viewerInviteStatus: 'declined' }, 'attending'),
    ).toBe(false)
  })

  it('"notAttending" matches only declined invites', () => {
    expect(
      matchesEventFilter({ isOwner: false, viewerInviteStatus: 'declined' }, 'notAttending'),
    ).toBe(true)
    expect(
      matchesEventFilter({ isOwner: false, viewerInviteStatus: 'accepted' }, 'notAttending'),
    ).toBe(false)
    expect(
      matchesEventFilter({ isOwner: false, viewerInviteStatus: 'pending' }, 'notAttending'),
    ).toBe(false)
    expect(matchesEventFilter({ isOwner: true }, 'notAttending')).toBe(false)
  })
})
