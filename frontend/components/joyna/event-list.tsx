import { format } from 'date-fns'

import { EventCard, type EventListItem } from './event-card'

type EventMonthGroup = {
  label: string
  events: EventListItem[]
}

/**
 * Groups events into consecutive runs sharing the same calendar month —
 * relies on the input already being date-sorted, so a month never reappears
 * as a second, non-adjacent group.
 */
export function groupEventsByMonth(events: EventListItem[]): EventMonthGroup[] {
  const groups: EventMonthGroup[] = []
  for (const event of events) {
    const label = format(new Date(event.date), 'MMMM yyyy')
    const currentGroup = groups[groups.length - 1]
    if (currentGroup?.label === label) {
      currentGroup.events.push(event)
    } else {
      groups.push({ label, events: [event] })
    }
  }
  return groups
}

export function EventListByMonth({
  events,
  fadePast,
}: {
  events: EventListItem[]
  fadePast?: boolean
}) {
  const now = Date.now()
  const groups = groupEventsByMonth(events)

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group, index) => (
        <div key={`${group.label}-${index}`} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold tracking-wide text-joyna-ink-faint uppercase">
            {group.label}
          </h3>
          <div className="flex flex-col gap-3">
            {group.events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                dimmed={fadePast && new Date(event.date).getTime() < now}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
