import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router"

import { Button } from "@/components/ui/button"

type ViewerInviteStatus = "pending" | "accepted" | "declined"

type EventDetailData = {
  id: string
  ownerId: string
  name: string
  description: string
  createdAt: string
  date: string
  location: string
  rsvpDeadline?: string
  type: string
  defaultSpreadAllowed: number
  isOwner: boolean
  viewerInviteStatus?: ViewerInviteStatus
}

type Attendee = {
  userId: string
  name: string
  email: string
  isOwner: boolean
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "full",
  timeStyle: "short",
})

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { credentials: "include" })
  if (!response.ok) {
    return null
  }
  return (await response.json()) as T
}

function AttendeesList({ attendees }: { attendees: Attendee[] }) {
  if (attendees.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendees yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {attendees.map((attendee) => (
        <li
          key={attendee.userId}
          className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
        >
          <span className="font-medium text-foreground">{attendee.name}</span>
          {attendee.isOwner && (
            <span className="text-xs text-muted-foreground">Host</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function InviteResponse({
  status,
  isResponding,
  onRespond,
}: {
  status: ViewerInviteStatus
  isResponding: boolean
  onRespond: (status: "accepted" | "declined") => void
}) {
  if (status === "accepted") {
    return (
      <p className="text-sm font-medium text-foreground">
        You&apos;re going to this event.
      </p>
    )
  }

  if (status === "declined") {
    return (
      <p className="text-sm text-muted-foreground">
        You declined this invite.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        disabled={isResponding}
        onClick={() => onRespond("accepted")}
      >
        Accept
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isResponding}
        onClick={() => onRespond("declined")}
      >
        Decline
      </Button>
    </div>
  )
}

function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState<EventDetailData | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const loadEvent = useCallback(async () => {
    if (!id) {
      return
    }
    setError(null)
    const eventDetail = await fetchJson<EventDetailData>(`/api/events/${id}`)
    if (!eventDetail) {
      setNotFound(true)
      setIsLoading(false)
      return
    }
    setEvent(eventDetail)
    const attendeeList = await fetchJson<Attendee[]>(
      `/api/events/${id}/attendees`,
    )
    setAttendees(attendeeList ?? [])
    setIsLoading(false)
  }, [id])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  async function handleRespond(status: "accepted" | "declined") {
    if (!id) {
      return
    }
    setIsResponding(true)
    setError(null)
    try {
      const response = await fetch(`/api/events/${id}/invite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        throw new Error("failed to respond to invite")
      }
      await loadEvent()
    } catch {
      setError("Couldn't save your response. Please try again.")
    } finally {
      setIsResponding(false)
    }
  }

  if (notFound) {
    return (
      <section className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
        <Link to="/events" className="text-sm text-primary hover:underline">
          ← Back to events
        </Link>
        <p className="text-muted-foreground">Event not found.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <Link to="/events" className="text-sm text-primary hover:underline">
        ← Back to events
      </Link>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {isLoading || !event ? (
        <p className="text-sm text-muted-foreground">Loading event…</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold text-foreground">
              {event.name}
            </h1>
            {event.isOwner && (
              <Button type="button" variant="outline">
                Edit
              </Button>
            )}
          </div>

          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="text-foreground">
                {dateFormatter.format(new Date(event.date))}
              </dd>
            </div>
            {event.location && (
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="text-foreground">{event.location}</dd>
              </div>
            )}
            {event.description && (
              <div>
                <dt className="text-muted-foreground">Description</dt>
                <dd className="text-foreground">{event.description}</dd>
              </div>
            )}
            {event.rsvpDeadline && (
              <div>
                <dt className="text-muted-foreground">RSVP by</dt>
                <dd className="text-foreground">
                  {dateFormatter.format(new Date(event.rsvpDeadline))}
                </dd>
              </div>
            )}
          </dl>

          {event.viewerInviteStatus && (
            <InviteResponse
              status={event.viewerInviteStatus}
              isResponding={isResponding}
              onRespond={handleRespond}
            />
          )}

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium text-foreground">Attendees</h2>
            <AttendeesList attendees={attendees} />
          </div>
        </>
      )}
    </section>
  )
}

export default EventDetail
