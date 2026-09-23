import {useCallback, useEffect, useMemo, useState} from 'react'
import {Link, Navigate, useParams} from 'react-router'
import {HugeiconsIcon} from '@hugeicons/react'
import {
  Location01Icon,
  Calendar01Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons'

import {Button} from '@/components/ui/button'
import {Textarea} from '@/components/ui/textarea'
import {Pill} from '../../components/joyna/pill'
import {
  GuestList,
  type NetworkCandidate,
} from '../../components/joyna/guest-list'
import {
  GuestRow,
  GuestGroupLabel,
  STATUS_ORDER,
  STATUS_LABEL,
  type Guest,
  type GuestStatus,
} from '../../components/joyna/guest-row'
import {DEFAULT_MOODS} from '../../components/joyna/mood-picker'
import {useAuth} from '../auth-context'
import {cn} from '@/lib/utils'

type ViewerInviteStatus = 'pending' | 'accepted' | 'declined'

type EventDetailData = {
  id: string
  ownerId: string
  name: string
  description: string
  date: string
  location: string
  rsvpDeadline?: string
  isOwner: boolean
  viewerInviteStatus?: ViewerInviteStatus
  viewerSpreadAllowed?: number
  viewerDeclineReason?: string
  mood?: string
}

type Attendee = {
  userId: string
  name: string
  email: string
  isOwner: boolean
  status?: 'pending' | 'accepted' | 'declined'
  invitedBy?: string
  declineReason?: string
}

type NetworkConnection = {
  contactId: string
  contactName: string
  groupId?: string
  groupName?: string
}

const DEFAULT_GROUP_NAME = 'Acquaintances'

const weekdayFormatter = new Intl.DateTimeFormat('en', {weekday: 'long'})
const monthFormatter = new Intl.DateTimeFormat('en', {month: 'short'})
const timeFormatter = new Intl.DateTimeFormat('en', {
  hour: 'numeric',
  minute: '2-digit',
})

/** e.g. "Saturday, 26 Sep at 2:30 pm" — year is only shown when the event isn't in the current year. */
function formatEventDate(date: Date): string {
  const showYear = date.getFullYear() !== new Date().getFullYear()
  const weekday = weekdayFormatter.format(date)
  const day = date.getDate()
  const month = monthFormatter.format(date)
  const year = showYear ? ` ${date.getFullYear()}` : ''
  const time = timeFormatter.format(date).toLowerCase()
  return `${weekday}, ${day} ${month}${year} at ${time}`
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {credentials: 'include'})
  if (!response.ok) {
    return null
  }
  return (await response.json()) as T
}

function inviteStatusToGuestStatus(
  status?: 'pending' | 'accepted' | 'declined',
): GuestStatus | undefined {
  if (status === 'accepted') return 'going'
  if (status === 'declined') return 'not_attending'
  if (status === 'pending') return 'pending'
  return undefined
}

function formatRsvpDeadline(rsvpDeadline?: string): string | null {
  if (!rsvpDeadline) return null
  const diffDays = Math.ceil(
    (new Date(rsvpDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays <= 0) return null
  return `RSVP in ${diffDays} day${diffDays === 1 ? '' : 's'}`
}

/**
 * Non-interactive guest listing for invitees who can't manage the guest
 * list at all (screens 05/06/07) or whose RSVP window has closed (19) —
 * same grouping/avatars as <GuestList>, but no edit affordance, ever.
 */
function StaticGuestList({
  guests,
  locked,
  onAddToNetwork,
}: {
  guests: Guest[]
  locked: boolean
  onAddToNetwork?: (id: string) => void
}) {
  const host = guests.find((g) => g.isHost)
  const grouped = useMemo(() => {
    const groups: Record<GuestStatus, Guest[]> = {
      going: [],
      pending: [],
      not_attending: [],
    }
    guests
      .filter((g) => !g.isHost)
      .forEach((g) => {
        if (g.status) groups[g.status].push(g)
      })
    return groups
  }, [guests])

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <h3 className="font-display text-base font-semibold">Guest list</h3>
        {locked && (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#A79FB0"
            strokeWidth={2}
          >
            <rect x="5" y="11" width="14" height="9" rx="2.5" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        )}
      </div>
      {host && <GuestRow guest={host} />}
      {STATUS_ORDER.map(
        (status) =>
          grouped[status].length > 0 && (
            <div key={status}>
              {STATUS_LABEL[status] && (
                <GuestGroupLabel>{STATUS_LABEL[status]}</GuestGroupLabel>
              )}
              {grouped[status].map((g) => (
                <GuestRow
                  key={g.id}
                  guest={g}
                  onAddToNetwork={locked ? undefined : onAddToNetwork}
                />
              ))}
            </div>
          ),
      )}
      {locked && (
        <p className="mt-2.5 text-[11px] text-joyna-ink-faint">
          The guest list is locked now that RSVPs are closed.
        </p>
      )}
    </div>
  )
}

function EventDetail() {
  const {id} = useParams()
  const {user} = useAuth()
  const [event, setEvent] = useState<EventDetailData | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [connections, setConnections] = useState<NetworkConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [declineNote, setDeclineNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  const loadEvent = useCallback(async () => {
    if (!id) return
    setError(null)
    const eventDetail = await fetchJson<EventDetailData>(`/api/events/${id}`)
    if (!eventDetail) {
      setNotFound(true)
      setIsLoading(false)
      return
    }
    setEvent(eventDetail)
    setDeclineNote(eventDetail.viewerDeclineReason ?? '')
    const [attendeeList, connectionList] = await Promise.all([
      fetchJson<Attendee[]>(`/api/events/${id}/attendees`),
      fetchJson<NetworkConnection[]>('/api/network'),
    ])
    setAttendees(attendeeList ?? [])
    setConnections(connectionList ?? [])
    setIsLoading(false)
  }, [id])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  const guests: Guest[] = useMemo(() => {
    return attendees.map((attendee) => {
      const isViewer = attendee.userId === user?.id
      const name = isViewer ? 'You' : attendee.name
      if (attendee.isOwner) {
        return {id: attendee.userId, name, isHost: true}
      }
      const connection = connections.find(
        (c) => c.contactId === attendee.userId,
      )
      return {
        id: attendee.userId,
        name,
        status: inviteStatusToGuestStatus(attendee.status),
        group: isViewer
          ? undefined
          : connection
            ? (connection.groupName ?? DEFAULT_GROUP_NAME)
            : null,
        reason: attendee.declineReason,
      }
    })
  }, [attendees, connections, user?.id])

  const attendingCount = useMemo(
    () => guests.filter((g) => g.isHost || g.status === 'going').length,
    [guests],
  )

  const candidates: NetworkCandidate[] = useMemo(() => {
    const attendeeIds = new Set(attendees.map((a) => a.userId))
    return connections
      .filter((c) => !attendeeIds.has(c.contactId))
      .map((c) => ({
        id: c.contactId,
        name: c.contactName,
        group: c.groupName ?? DEFAULT_GROUP_NAME,
      }))
  }, [attendees, connections])

  async function handleRespond(
    status: 'accepted' | 'declined',
    reason?: string,
  ) {
    if (!id) return
    setIsResponding(true)
    setError(null)
    try {
      const response = await fetch(`/api/events/${id}/invite`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({status, reason}),
      })
      if (!response.ok) {
        throw new Error('failed to respond to invite')
      }
      await loadEvent()
    } catch {
      setError("Couldn't save your response. Please try again.")
    } finally {
      setIsResponding(false)
    }
  }

  async function handleSaveDeclineNote() {
    await handleRespond('declined', declineNote)
    setNoteSaved(true)
  }

  async function handleAddToNetwork(contactId: string) {
    await fetch('/api/network', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({contactId}),
    })
    const connectionList = await fetchJson<NetworkConnection[]>('/api/network')
    setConnections(connectionList ?? [])
  }

  async function handleCommitGuests(nextGuests: Guest[]) {
    if (!id) return
    const originalIds = new Set(
      attendees.filter((a) => !a.isOwner).map((a) => a.userId),
    )
    const nextIds = new Set(
      nextGuests.filter((g) => !g.isHost).map((g) => g.id),
    )

    const additions = [...nextIds].filter(
      (guestId) => !originalIds.has(guestId),
    )
    const removals = [...originalIds].filter((guestId) => !nextIds.has(guestId))

    await Promise.all([
      ...additions.map((invitedUserId) =>
        fetch('/api/events/invites', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          credentials: 'include',
          body: JSON.stringify({eventId: id, invitedUserId, spreadAllowed: 0}),
        }),
      ),
      ...removals.map((userId) =>
        fetch(`/api/events/${id}/invites/${userId}`, {
          method: 'DELETE',
          credentials: 'include',
        }),
      ),
    ])

    await loadEvent()
  }

  if (notFound) {
    return <Navigate to="/events" replace />
  }

  if (isLoading || !event) {
    return (
      <p className="px-6 py-16 text-center text-sm text-joyna-ink-faint">
        Loading event…
      </p>
    )
  }

  const rsvpClosed = Boolean(
    event.rsvpDeadline && new Date(event.rsvpDeadline).getTime() < Date.now(),
  )
  const rsvpLabel = formatRsvpDeadline(event.rsvpDeadline)
  const mood = DEFAULT_MOODS.find((m) => m.id === event.mood)
  const canAddGuests =
    !event.isOwner &&
    event.viewerInviteStatus === 'accepted' &&
    Boolean(event.viewerSpreadAllowed && event.viewerSpreadAllowed > 0) &&
    !rsvpClosed

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6 font-body">
      {error && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          {error}
        </p>
      )}

      <div>
        <h1 className="font-display text-xl font-semibold text-joyna-ink">
          {event.name}
        </h1>
        <div className="mt-3 flex flex-col gap-3 text-sm text-joyna-ink">
          <span className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Calendar01Icon}
              className="h-3.5 w-3.5"
              strokeWidth={2}
            />
            {formatEventDate(new Date(event.date))}
          </span>
          {event.location && (
            <span className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Location01Icon}
                className="h-3.5 w-3.5"
                strokeWidth={2}
              />
              {event.location}
            </span>
          )}
          {rsvpClosed || rsvpLabel || mood ? (
            <div className="flex flex-wrap items-center gap-2">
              {rsvpClosed ? (
                <Pill tone="muted">🔒 RSVP closed</Pill>
              ) : (
                rsvpLabel && <Pill tone="sunflower">{rsvpLabel}</Pill>
              )}
              {mood && (
                <Pill tone="periwinkle">
                  {mood.emoji} {mood.label} mood
                </Pill>
              )}
            </div>
          ) : null}
          <span className="flex items-center gap-2">
            <HugeiconsIcon
              icon={UserMultipleIcon}
              className="h-3.5 w-3.5"
              strokeWidth={2}
            />
            {attendingCount} attending
          </span>
        </div>
        {event.description && (
          <p className="mt-4 whitespace-pre-line text-sm text-joyna-ink-soft">
            {event.description}
          </p>
        )}
      </div>

      <div className="border-t border-joyna-border" />

      {event.isOwner ? (
        <Button
          variant="secondary"
          className="h-11 w-full rounded-control font-display text-sm"
          render={<Link to={`/events/${event.id}/edit`} />}
        >
          Edit details
        </Button>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-center font-display text-sm font-semibold text-joyna-ink">
            Will you be attending?
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={
                event.viewerInviteStatus === 'declined' ? 'default' : 'outline'
              }
              disabled={isResponding || rsvpClosed}
              onClick={() => handleRespond('declined', declineNote)}
              className={
                event.viewerInviteStatus === 'declined'
                  ? 'h-11 flex-1 rounded-control font-display text-sm bg-joyna-bubblegum text-joyna-bubblegum-dark hover:bg-joyna-bubblegum'
                  : 'h-11 flex-1 rounded-control font-display text-sm bg-white text-joyna-ink-soft'
              }
            >
              No
            </Button>
            <Button
              type="button"
              variant={
                event.viewerInviteStatus === 'accepted' ? 'default' : 'outline'
              }
              disabled={isResponding || rsvpClosed}
              onClick={() => handleRespond('accepted')}
              className={
                event.viewerInviteStatus === 'accepted'
                  ? 'h-11 flex-1 rounded-control font-display text-sm bg-joyna-mint text-white hover:bg-joyna-mint'
                  : 'h-11 flex-1 rounded-control font-display text-sm bg-white text-joyna-ink-soft'
              }
            >
              Yes
            </Button>
          </div>
          {rsvpClosed && (
            <p className="text-xs text-joyna-ink-faint">
              RSVP deadline has passed — your response is locked in.
            </p>
          )}
          {!rsvpClosed && event.viewerInviteStatus === 'declined' && (
            <div className="flex flex-col gap-3">
              <label className="text-sm text-joyna-ink" htmlFor="decline-note">
                Let the host know why (optional)
              </label>
              <div className="relative">
                <Textarea
                  id="decline-note"
                  value={declineNote}
                  onChange={(e) => {
                    setDeclineNote(e.target.value)
                    setNoteSaved(false)
                  }}
                  rows={4}
                  className="rounded-field pb-14"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(
                    'absolute right-3 bottom-3 h-10 rounded-control font-display text-sm',
                    noteSaved && 'bg-gray-900 text-white border-none',
                  )}
                  disabled={isResponding}
                  onClick={handleSaveDeclineNote}
                >
                  {noteSaved ? 'Saved' : 'Save note'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-joyna-border" />

      {event.isOwner ? (
        <GuestList
          eventTitle={event.name}
          guests={guests}
          candidates={candidates}
          onCommit={handleCommitGuests}
          onAddToNetwork={handleAddToNetwork}
          canRemove={() => true}
        />
      ) : canAddGuests ? (
        <GuestList
          eventTitle={event.name}
          guests={guests}
          candidates={candidates}
          onCommit={handleCommitGuests}
          onAddToNetwork={handleAddToNetwork}
          canRemove={(g) =>
            attendees.find((a) => a.userId === g.id)?.invitedBy === user?.id
          }
        />
      ) : (
        <StaticGuestList
          guests={guests}
          locked={rsvpClosed}
          onAddToNetwork={handleAddToNetwork}
        />
      )}
    </section>
  )
}

export default EventDetail
