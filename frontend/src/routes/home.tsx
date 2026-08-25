import { useEffect, useState } from "react"

import { useAuth } from "../auth-context"

type DashboardEvent = {
  id: string
  name: string
  date: string
  location: string
}

type EventScope = "owned" | "invited"
type EventSortField = "date" | "createdAt"

const DASHBOARD_LIMIT = 5

async function fetchEvents(
  scope: EventScope,
  sort: EventSortField,
): Promise<DashboardEvent[]> {
  const params = new URLSearchParams({ scope, sort, order: "desc" })
  const response = await fetch(`/api/events?${params.toString()}`, {
    credentials: "include",
  })
  if (!response.ok) {
    throw new Error("failed to load events")
  }
  return (await response.json()) as DashboardEvent[]
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" })
}

function EventList({
  title,
  events,
  emptyMessage,
}: {
  title: string
  events: DashboardEvent[]
  emptyMessage: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-md border border-border px-4 py-3 text-sm"
            >
              <p className="font-medium text-foreground">{event.name}</p>
              <p className="text-muted-foreground">
                {formatEventDate(event.date)} &middot; {event.location}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Home() {
  const { user } = useAuth()
  const [createdEvents, setCreatedEvents] = useState<DashboardEvent[]>([])
  const [invitedEvents, setInvitedEvents] = useState<DashboardEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)
      try {
        const [created, invited] = await Promise.all([
          fetchEvents("owned", "createdAt"),
          fetchEvents("invited", "date"),
        ])
        if (!isMounted) {
          return
        }
        setCreatedEvents(created.slice(0, DASHBOARD_LIMIT))
        setInvitedEvents(invited.slice(0, DASHBOARD_LIMIT))
      } catch {
        if (isMounted) {
          setError("Couldn't load your dashboard. Please try again later.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Welcome back, {user?.name}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your events.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading your dashboard&hellip;
        </p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          <EventList
            title="Your latest events"
            events={createdEvents}
            emptyMessage="You haven't created any events yet."
          />
          <EventList
            title="Events you're invited to"
            events={invitedEvents}
            emptyMessage="You don't have any upcoming invitations."
          />
        </div>
      )}
    </section>
  )
}

export default Home
