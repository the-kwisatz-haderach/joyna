import { cn } from '@/lib/utils'

export type EventFilters = {
  hosting: boolean
  invited: boolean
  rsvpDeadline: boolean
}

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  hosting: true,
  invited: true,
  rsvpDeadline: false,
}

const FILTER_OPTIONS: { key: keyof EventFilters; label: string }[] = [
  { key: 'hosting', label: 'Hosting' },
  { key: 'invited', label: 'Invited' },
  { key: 'rsvpDeadline', label: 'RSVP deadline' },
]

/** Filters are independent toggles combined with OR, not an exclusive picker. */
export function matchesEventFilters(
  event: { isOwner: boolean; rsvpDeadline?: string },
  filters: EventFilters,
): boolean {
  return (
    (filters.hosting && event.isOwner) ||
    (filters.invited && !event.isOwner) ||
    (filters.rsvpDeadline && Boolean(event.rsvpDeadline))
  )
}

export function EventFilterBar({
  filters,
  onChange,
}: {
  filters: EventFilters
  onChange: (filters: EventFilters) => void
}) {
  return (
    <div
      role="group"
      aria-label="Filter events"
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
    >
      {FILTER_OPTIONS.map(({ key, label }) => {
        const active = filters[key]
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange({ ...filters, [key]: !active })}
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
