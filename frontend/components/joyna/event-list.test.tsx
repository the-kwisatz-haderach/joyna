import { describe, expect, it } from 'vitest'

import { groupEventsByMonth } from './event-list'
import type { EventListItem } from './event-card'

function makeEvent(id: string, date: string): EventListItem {
  return {
    id,
    ownerId: 'owner',
    name: id,
    description: '',
    date,
    location: '',
    isOwner: true,
  }
}

describe('groupEventsByMonth', () => {
  it('groups consecutive events sharing a calendar month', () => {
    const events = [
      makeEvent('a', '2026-09-05T10:00:00Z'),
      makeEvent('b', '2026-09-20T10:00:00Z'),
      makeEvent('c', '2026-10-04T10:00:00Z'),
    ]

    const groups = groupEventsByMonth(events)

    expect(groups).toHaveLength(2)
    expect(groups[0].label).toBe('September 2026')
    expect(groups[0].events.map((e) => e.id)).toEqual(['a', 'b'])
    expect(groups[1].label).toBe('October 2026')
    expect(groups[1].events.map((e) => e.id)).toEqual(['c'])
  })

  it('starts a new group if the same month reappears non-consecutively', () => {
    const events = [
      makeEvent('a', '2026-09-05T10:00:00Z'),
      makeEvent('b', '2026-10-04T10:00:00Z'),
      makeEvent('c', '2026-09-25T10:00:00Z'),
    ]

    const groups = groupEventsByMonth(events)

    expect(groups.map((g) => g.label)).toEqual(['September 2026', 'October 2026', 'September 2026'])
  })

  it('returns an empty array for no events', () => {
    expect(groupEventsByMonth([])).toEqual([])
  })
})
