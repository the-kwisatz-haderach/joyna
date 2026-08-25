import { useEffect, useState } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"

type Event = {
  id: string
  name: string
  description: string
  date: string
  location: string
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

function EventCard({ event }: { event: Event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:bg-muted"
    >
      <span className="font-medium text-foreground">{event.name}</span>
      <span className="text-sm text-muted-foreground">
        {dateFormatter.format(new Date(event.date))} · {event.location}
      </span>
    </Link>
  )
}

function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
  const activeEvents = events
    .filter((event) => new Date(event.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const archivedEvents = events
    .filter((event) => new Date(event.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Events</h1>
        <Button render={<Link to="/events/new" />}>Create event</Button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Upcoming</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading events…</p>
        ) : activeEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activeEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Archive</h2>
        {isLoading ? null : archivedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past events.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {archivedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Events
