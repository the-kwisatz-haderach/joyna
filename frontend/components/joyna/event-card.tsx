import {Link} from 'react-router'
import {HugeiconsIcon} from '@hugeicons/react'
import {ArrowRight01Icon} from '@hugeicons/core-free-icons'
import {format, isSameYear} from 'date-fns'

import {cn} from '@/lib/utils'
import {Pill} from './pill'
import {HostBadge} from './host-badge'

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
  icon?: string
}

export function formatEventDate(date: string): string {
  const parsed = new Date(date)
  return isSameYear(parsed, Date.now())
    ? format(parsed, 'd MMM')
    : format(parsed, 'd MMM, yyyy')
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

function eventCardTone(
  event: Pick<EventListItem, 'isOwner' | 'viewerInviteStatus'>,
): string {
  if (event.isOwner) {
    return 'border-joyna-sunflower bg-white'
  }
  if (event.viewerInviteStatus === 'accepted') {
    return 'border-joyna-mint bg-joyna-mint/10'
  }
  if (event.viewerInviteStatus === 'declined') {
    return 'border-joyna-bubblegum bg-joyna-bubblegum/10'
  }
  return 'border-joyna-border bg-white'
}

export function EventCard({
  event,
  dimmed,
}: {
  event: EventListItem
  dimmed?: boolean
}) {
  const rsvpLabel = formatRsvpDeadline(event.rsvpDeadline)

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'flex items-center justify-between gap-3 rounded-card border p-4 transition-opacity',
        eventCardTone(event),
        dimmed && 'opacity-60 hover:opacity-80',
      )}
    >
      {event.icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-joyna-sunflower/20 text-xl">
          {event.icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-joyna-ink">
          <span className="truncate">{event.name}</span>
          {event.isOwner ? <HostBadge label="Hosting" /> : null}
        </span>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-joyna-ink-soft min-w-fit">
            {formatEventDate(event.date)}
          </span>
          {event.location && (
            <>
              <span className="text-joyna-ink-faint">·</span>
              <span className="truncate text-joyna-ink-faint">
                {event.location}
              </span>
            </>
          )}
        </div>
        {rsvpLabel && (
          <Pill className="w-fit" tone="sunflower">
            {rsvpLabel}
          </Pill>
        )}
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-joyna-border-strong text-joyna-ink-soft">
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="h-4 w-4"
          strokeWidth={2}
        />
      </span>
    </Link>
  )
}
