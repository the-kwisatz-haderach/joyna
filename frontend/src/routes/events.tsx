import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import {
  EventFilterBar,
  DEFAULT_EVENT_FILTER,
  matchesEventFilter,
  type EventFilter,
} from '../../components/joyna/event-filter-bar'
import { EventListByMonth } from '../../components/joyna/event-list'
import type { EventListItem } from '../../components/joyna/event-card'

const MAX_EVENTS = 10

function EmptyEventsState() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-joyna-periwinkle/10 text-joyna-periwinkle">
        <HugeiconsIcon icon={Calendar03Icon} className="h-8 w-8" strokeWidth={1.8} />
      </div>
      <h2 className="font-display text-lg font-semibold text-joyna-ink">No events yet</h2>
      <p className="text-sm text-joyna-ink-soft">
        Create your first event or wait for an invite to show up here.
      </p>
      <Button
        render={<Link to="/events/new" />}
        className="mt-2 h-11 rounded-control px-6 font-display text-sm"
      >
        <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" strokeWidth={2} />
        New event
      </Button>
    </div>
  )
}

function Events() {
  const [events, setEvents] = useState<EventListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<EventFilter>(DEFAULT_EVENT_FILTER)

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      try {
        const response = await fetch('/api/events?scope=all&sort=date&order=asc', {
          credentials: 'include',
        })
        if (!response.ok) {
          return
        }
        const data = (await response.json()) as EventListItem[]
        if (!cancelled) {
          setEvents(data)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadEvents()
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return <p className="px-6 py-16 text-center text-sm text-joyna-ink-faint">Loading events…</p>
  }

  const now = Date.now()
  const upcoming = events.filter((event) => new Date(event.date).getTime() >= now)

  if (upcoming.length === 0) {
    return <EmptyEventsState />
  }

  const filtered = upcoming.filter((event) => matchesEventFilter(event, filter))
  const visible = filtered.slice(0, MAX_EVENTS)

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-joyna-ink">Upcoming events</h2>
        <Link to="/events/all" className="text-xs font-semibold text-joyna-coral">
          View all
        </Link>
      </div>
      <EventFilterBar filter={filter} onChange={setFilter} />
      {visible.length === 0 ? (
        <p className="text-sm text-joyna-ink-faint">No events match these filters.</p>
      ) : (
        <EventListByMonth events={visible} />
      )}
    </section>
  )
}

export default Events
