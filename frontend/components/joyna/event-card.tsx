import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { format, isSameYear } from 'date-fns'

import { cn } from '@/lib/utils'
import { Pill } from './pill'

export type EventInviteStatus = 'pending' | 'accepted' | 'declined'

export type EventListItem = {
  id: string
  ownerId: string
  name: string
  description: string
  date: string
  location: string
  rsvpDeadline?: string
  isOwner: boolean
  viewerInviteStatus?: EventInviteStatus
}

export function formatEventDate(date: string): string {
  const parsed = new Date(date)
  return isSameYear(parsed, Date.now()) ? format(parsed, 'd MMM') : format(parsed, 'd MMM, yyyy')
}

export function formatRsvpDeadline(rsvpDeadline?: string): string | null {
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

function HostBadge() {
  return (
    <span
      role="img"
      aria-label="Hosting"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-joyna-sunflower text-joyna-sunflower-dark"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 8l4.5 3.2L12 4l4.5 7.2L21 8l-2 10H5L3 8z" />
      </svg>
    </span>
  )
}

function AcceptedBadge() {
  return (
    <span
      role="img"
      aria-label="Attending"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-joyna-mint text-white"
    >
      <HugeiconsIcon icon={Tick02Icon} className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  )
}

export function EventCard({ event, dimmed }: { event: EventListItem; dimmed?: boolean }) {
  const rsvpLabel = formatRsvpDeadline(event.rsvpDeadline)

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'flex items-center justify-between gap-3 rounded-card border bg-white p-4 transition-opacity',
        event.isOwner ? 'border-joyna-sunflower' : 'border-joyna-border',
        dimmed && 'opacity-60 hover:opacity-80',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-joyna-ink">
          <span className="truncate">{event.name}</span>
          {event.isOwner ? (
            <HostBadge />
          ) : event.viewerInviteStatus === 'accepted' ? (
            <AcceptedBadge />
          ) : null}
        </span>
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
