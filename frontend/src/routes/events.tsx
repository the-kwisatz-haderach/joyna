import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { format, isSameYear } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Pill } from '../../components/joyna/pill'
import { useAuth } from '../auth-context'

type Event = {
  id: string
  ownerId: string
  name: string
  description: string
  date: string
  location: string
  rsvpDeadline?: string
}

const PREVIEW_COUNT = 3

function formatEventDate(date: string): string {
  const parsed = new Date(date)
  return isSameYear(parsed, Date.now()) ? format(parsed, 'd MMM') : format(parsed, 'd MMM, yyyy')
}

function formatRsvpDeadline(rsvpDeadline?: string): string | null {
  if (!rsvpDeadline) {
    return null
  }
  const diffDays = Math.ceil(
    (new Date(rsvpDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays <= 0) {
    return null
  }
  return `RSVP in ${diffDays} day${diffDays === 1 ? '' : 's'}`
}

function EventCard({
  event,
  dimmed,
  showRsvpDeadline,
}: {
  event: Event
  dimmed?: boolean
  showRsvpDeadline?: boolean
}) {
  const rsvpLabel = showRsvpDeadline ? formatRsvpDeadline(event.rsvpDeadline) : null

  return (
    <Link
      to={`/events/${event.id}`}
      className={
        dimmed
          ? 'flex items-center justify-between gap-3 rounded-card border border-joyna-border bg-white p-4 opacity-60 transition-opacity hover:opacity-80'
          : 'flex items-center justify-between gap-3 rounded-card border border-joyna-border bg-white p-4 shadow-sm transition-shadow hover:shadow'
      }
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-display text-sm font-semibold text-joyna-ink">{event.name}</span>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-joyna-ink-soft">{formatEventDate(event.date)}</span>
          {rsvpLabel ? (
            <>
              <span className="text-joyna-ink-faint">·</span>
              <Pill tone="sunflower">{rsvpLabel}</Pill>
            </>
          ) : (
            event.location && (
              <>
                <span className="text-joyna-ink-faint">·</span>
                <span className="truncate text-joyna-ink-faint">{event.location}</span>
              </>
            )
          )}
        </div>
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-joyna-border-strong text-joyna-ink-soft">
        <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" strokeWidth={2} />
      </span>
    </Link>
  )
}

function EventSection({
  title,
  events,
  emptyMessage,
  dimmed,
  showRsvpDeadline,
}: {
  title: string
  events: Event[]
  emptyMessage: string
  dimmed?: boolean
  showRsvpDeadline?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? events : events.slice(0, PREVIEW_COUNT)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-joyna-ink">{title}</h2>
        {events.length > PREVIEW_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-joyna-coral"
          >
            {expanded ? 'Show less' : 'View all'}
          </button>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-joyna-ink-faint">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} dimmed={dimmed} showRsvpDeadline={showRsvpDeadline} />
          ))}
        </div>
      )}
    </div>
  )
}

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
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      try {
        const response = await fetch('/api/events?scope=all&sort=date&order=desc', {
          credentials: 'include',
        })
        if (!response.ok) {
          return
        }
        const data = (await response.json()) as Event[]
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
  const hosting = events
    .filter((event) => event.ownerId === user?.id && new Date(event.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const upcoming = events
    .filter((event) => event.ownerId !== user?.id && new Date(event.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const past = events
    .filter((event) => new Date(event.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (hosting.length === 0 && upcoming.length === 0 && past.length === 0) {
    return <EmptyEventsState />
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-6">
      <EventSection title="Your events" events={hosting} emptyMessage="You're not hosting any upcoming events." />
      <EventSection
        title="Upcoming"
        events={upcoming}
        emptyMessage="No upcoming invitations yet."
        showRsvpDeadline
      />
      <EventSection title="Past events" events={past} emptyMessage="No past events." dimmed />
    </section>
  )
}

export default Events
