import { cn } from '@/lib/utils'
import type { EventInviteStatus } from './event-card'

export type EventFilter = 'all' | 'hasDeadline' | 'invites' | 'hosting' | 'attending' | 'notAttending'

export const DEFAULT_EVENT_FILTER: EventFilter = 'all'

const FILTER_OPTIONS: { key: EventFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hasDeadline', label: 'Has deadline' },
  { key: 'invites', label: 'Invites' },
  { key: 'hosting', label: 'Hosting' },
  { key: 'attending', label: 'Attending' },
  { key: 'notAttending', label: 'Not attending' },
]

/** Filters are mutually exclusive - exactly one is active at a time. */
export function matchesEventFilter(
  event: { isOwner: boolean; rsvpDeadline?: string; viewerInviteStatus?: EventInviteStatus },
  filter: EventFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'hasDeadline':
      return !event.isOwner && Boolean(event.rsvpDeadline)
    case 'invites':
      return !event.isOwner
    case 'hosting':
      return event.isOwner
    case 'attending':
      return event.isOwner || event.viewerInviteStatus === 'accepted'
    case 'notAttending':
      return !event.isOwner && event.viewerInviteStatus === 'declined'
  }
}

export function EventFilterBar({
  filter,
  onChange,
}: {
  filter: EventFilter
  onChange: (filter: EventFilter) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter events"
      className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1"
    >
      {FILTER_OPTIONS.map(({ key, label }) => {
        const active = filter === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-colors',
              active
                ? 'border-joyna-ink bg-joyna-ink text-white'
                : 'border-joyna-border-strong bg-white text-joyna-ink-soft',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
