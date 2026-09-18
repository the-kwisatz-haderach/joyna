import { useEffect, useMemo, useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  EventFilterBar,
  DEFAULT_EVENT_FILTER,
  matchesEventFilter,
  type EventFilter,
} from '../../components/joyna/event-filter-bar'
import { EventListByMonth } from '../../components/joyna/event-list'
import type { EventListItem } from '../../components/joyna/event-card'

const PAGE_SIZE = 10

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) {
    return null
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-2 text-sm">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="px-2 font-semibold text-joyna-ink-soft disabled:text-joyna-ink-faint disabled:opacity-50"
      >
        ‹ Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold transition-colors',
            p === page ? 'bg-joyna-ink text-white' : 'text-joyna-ink-soft',
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="px-2 font-semibold text-joyna-ink-soft disabled:text-joyna-ink-faint disabled:opacity-50"
      >
        Next ›
      </button>
    </nav>
  )
}

function AllEvents() {
  const [events, setEvents] = useState<EventListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<EventFilter>(DEFAULT_EVENT_FILTER)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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
        const data = (await response.json()) as EventListItem[]
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((event) => {
      if (!matchesEventFilter(event, filter)) {
        return false
      }
      if (!query) {
        return true
      }
      return (
        event.name.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      )
    })
  }, [events, filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function updateFilter(next: EventFilter) {
    setFilter(next)
    setPage(1)
  }

  function updateSearch(next: string) {
    setSearch(next)
    setPage(1)
  }

  if (isLoading) {
    return <p className="px-6 py-16 text-center text-sm text-joyna-ink-faint">Loading events…</p>
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6">
      <h1 className="font-display text-xl font-semibold text-joyna-ink">All events</h1>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-joyna-ink-faint">
          <SearchIcon />
        </span>
        <Input
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search events…"
          aria-label="Search events"
          className="h-11 rounded-control border-joyna-border-strong bg-white pl-9 text-sm"
        />
      </div>
      <EventFilterBar filter={filter} onChange={updateFilter} />
      {filtered.length === 0 ? (
        <p className="text-sm text-joyna-ink-faint">No events match your search or filters.</p>
      ) : (
        <>
          <EventListByMonth events={visible} fadePast />
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </section>
  )
}

export default AllEvents
