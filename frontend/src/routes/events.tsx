import { useEffect, useState } from "react"
import { Link } from "react-router"

type Event = {
  id: string
  name: string
  description: string
  date: string
  location: string
  rsvpDeadline?: string
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

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
  return `RSVP within ${diffDays} day${diffDays === 1 ? "" : "s"}`
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "size-4"}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function EventCard({
  event,
  showRsvpDeadline,
}: {
  event: Event
  showRsvpDeadline?: boolean
}) {
  const rsvpLabel = showRsvpDeadline
    ? formatRsvpDeadline(event.rsvpDeadline)
    : null

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-card-foreground">{event.name}</span>
        <span className="text-sm text-muted-foreground">
          {dateFormatter.format(new Date(event.date))}
        </span>
        <span className="text-sm text-muted-foreground">
          {event.location}
        </span>
        {rsvpLabel && (
          <span className="text-sm text-muted-foreground">{rsvpLabel}</span>
        )}
      </div>
      <Link
        to={`/events/${event.id}`}
        aria-label={`View ${event.name} details`}
        className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
      >
        <ArrowRightIcon />
      </Link>
    </div>
  )
}

function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHappenedOpen, setIsHappenedOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      try {
        const response = await fetch("/api/events", {
          credentials: "include",
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

  const now = Date.now()
  const upcomingEvents = events
    .filter((event) => new Date(event.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const happenedEvents = events
    .filter((event) => new Date(event.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Upcoming</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading events…</p>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} showRsvpDeadline />
            ))}
          </div>
        )}
      </div>

      {isLoading ? null : (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-foreground">
            <button
              type="button"
              aria-expanded={isHappenedOpen}
              onClick={() => setIsHappenedOpen((open) => !open)}
              className="flex items-center gap-1.5 text-foreground hover:text-primary"
            >
              <ChevronDownIcon
                className={
                  isHappenedOpen ? "size-4 transition-transform" : "size-4 -rotate-90 transition-transform"
                }
              />
              Happened
            </button>
          </h2>
          {isHappenedOpen &&
            (happenedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past events.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {happenedEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ))}
        </div>
      )}
    </section>
  )
}

export default Events
