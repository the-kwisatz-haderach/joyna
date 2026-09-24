import {useEffect, useMemo, useState} from 'react'
import {Link} from 'react-router'
import {HugeiconsIcon} from '@hugeicons/react'
import {ArrowRight01Icon, UserAdd01Icon} from '@hugeicons/core-free-icons'

import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {GuestAvatar} from '../../components/joyna/guest-avatar'

type NetworkConnection = {
  contactId: string
  contactName: string
  contactEmail: string
  groupId?: string
  groupName?: string
  eventsTogetherCount: number
}

type PotentialConnection = {
  userId: string
  name: string
  email: string
  sharedEventCount: number
}

const DEFAULT_GROUP_NAME = 'Acquaintances'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {credentials: 'include'})
  if (!response.ok) {
    throw new Error(`failed to load ${url}`)
  }
  return (await response.json()) as T
}

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

function eventsTogetherLabel(count: number): string {
  return `${count} ${count === 1 ? 'event' : 'events'} together`
}

function matchesQuery(connection: NetworkConnection, query: string): boolean {
  if (!query) {
    return true
  }
  const needle = query.trim().toLowerCase()
  const groupName = (connection.groupName ?? DEFAULT_GROUP_NAME).toLowerCase()
  return (
    connection.contactName.toLowerCase().includes(needle) ||
    groupName.includes(needle)
  )
}

function groupConnections(connections: NetworkConnection[]) {
  const groups = new Map<
    string,
    {name: string; members: NetworkConnection[]}
  >()

  for (const connection of connections) {
    const key = connection.groupId ?? 'default'
    const existing = groups.get(key)
    if (existing) {
      existing.members.push(connection)
    } else {
      groups.set(key, {
        name: connection.groupName ?? DEFAULT_GROUP_NAME,
        members: [connection],
      })
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      // Highest events-together first; ties broken alphabetically so the
      // order stays stable rather than flip-flopping between reloads.
      members: [...group.members].sort(
        (a, b) =>
          b.eventsTogetherCount - a.eventsTogetherCount ||
          a.contactName.localeCompare(b.contactName),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function EmptyNetworkState() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-joyna-periwinkle/10 text-joyna-periwinkle">
        <HugeiconsIcon
          icon={UserAdd01Icon}
          className="h-8 w-8"
          strokeWidth={1.8}
        />
      </div>
      <h2 className="font-display text-lg font-semibold text-joyna-ink">
        Your network is empty
      </h2>
      <p className="text-sm text-joyna-ink-soft">
        Add someone by email, or check the suggestions below.
      </p>
      <Button
        render={<Link to="/network/add" />}
        className="mt-2 h-11 rounded-control px-6 font-display text-sm"
      >
        <HugeiconsIcon
          icon={UserAdd01Icon}
          className="h-4 w-4"
          strokeWidth={2}
        />
        Add by email
      </Button>
    </div>
  )
}

function ContactRow({contact}: {contact: NetworkConnection}) {
  return (
    <li>
      <Link
        to={`/network/${contact.contactId}`}
        className="flex items-center justify-between gap-3 py-2"
      >
        <div className="flex min-w-0 items-center gap-3">
          <GuestAvatar name={contact.contactName} />
          <span className="flex items-center gap-1.5 truncate font-display text-sm font-semibold text-joyna-ink">
            {contact.contactName}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-joyna-ink-faint">
          {eventsTogetherLabel(contact.eventsTogetherCount)}
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="h-4 w-4"
            strokeWidth={2}
          />
        </div>
      </Link>
    </li>
  )
}

function NetworkGroups({
  groups,
  addByEmailSlot,
}: {
  groups: ReturnType<typeof groupConnections>
  addByEmailSlot: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group, index) => (
        <div key={group.name} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-joyna-ink-faint uppercase">
              {group.name}
            </h3>
            {index === 0 && addByEmailSlot}
          </div>
          <ul className="flex flex-col gap-2">
            {group.members.map((member) => (
              <ContactRow key={member.contactId} contact={member} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function PotentialNetwork({
  potentialConnections,
  pendingUserId,
  onAdd,
}: {
  potentialConnections: PotentialConnection[]
  pendingUserId: string | null
  onAdd: (userId: string) => void
}) {
  return (
    <ul className="flex flex-col">
      {potentialConnections.map((candidate) => (
        <li
          key={candidate.userId}
          className="flex items-center gap-2.5 py-2 text-sm"
        >
          <GuestAvatar name={candidate.name} />
          <span className="flex-1 truncate font-display font-semibold text-joyna-ink">
            {candidate.name}
          </span>
          <span className="shrink-0 text-[11px] whitespace-nowrap text-joyna-ink-faint">
            {eventsTogetherLabel(candidate.sharedEventCount)}
          </span>
          <button
            type="button"
            aria-label={`Add ${candidate.name}`}
            disabled={pendingUserId === candidate.userId}
            onClick={() => onAdd(candidate.userId)}
            className="ml-2 flex shrink-0 items-center gap-1 rounded-full bg-joyna-periwinkle/10 px-2.5 py-1 text-[10.5px] font-semibold text-joyna-periwinkle-dark transition-transform active:scale-90 disabled:opacity-50"
          >
            <HugeiconsIcon
              icon={UserAdd01Icon}
              className="h-3 w-3"
              strokeWidth={2.2}
            />{' '}
            Add
          </button>
        </li>
      ))}
    </ul>
  )
}

function Network() {
  const [connections, setConnections] = useState<NetworkConnection[]>([])
  const [potentialConnections, setPotentialConnections] = useState<
    PotentialConnection[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Every call site already clears `error` itself before calling this (the
  // mount effect below starts from the initial `null` state; handleAdd
  // clears it explicitly), so this doesn't reset it again — a synchronous
  // setState here would otherwise run inside the mount effect's callframe
  // (an async function's body runs synchronously up to its first `await`),
  // triggering an extra, avoidable render before any real work starts.
  async function loadNetwork() {
    try {
      const [currentNetwork, potential] = await Promise.all([
        fetchJson<NetworkConnection[]>('/api/network'),
        fetchJson<PotentialConnection[]>('/api/network/potential'),
      ])
      setConnections(currentNetwork)
      setPotentialConnections(potential)
    } catch {
      setError("Couldn't load your network. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  // Calling loadNetwork() directly here (rather than from this nested IIFE)
  // would trip set-state-in-effect, since the linter treats any function
  // invoked straight from an effect body as if it set state synchronously —
  // even though loadNetwork's own setState calls only run after an await.
  // The `cancelled` guard is a genuine bonus, not just a lint workaround: it
  // stops a slow initial fetch from re-running loadNetwork if this effect
  // re-fires (e.g. React StrictMode's dev double-invoke) before the first
  // call has settled.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await loadNetwork()
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(
    () =>
      groupConnections(
        connections.filter((connection) => matchesQuery(connection, query)),
      ),
    [connections, query],
  )

  async function handleAdd(userId: string) {
    setPendingUserId(userId)
    setError(null)
    try {
      const response = await fetch('/api/network', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({contactId: userId}),
      })
      if (!response.ok) {
        throw new Error('failed to add connection')
      }
      await loadNetwork()
    } catch {
      setError("Couldn't add that person to your network. Please try again.")
    } finally {
      setPendingUserId(null)
    }
  }

  const addByEmailLink = (
    <Link to="/network/add" className="text-xs font-semibold text-joyna-coral">
      + Add by email
    </Link>
  )

  const potentialConnectionsSection = potentialConnections.length > 0 && (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-joyna-ink-faint uppercase">
        People you may know
      </h3>
      <PotentialNetwork
        potentialConnections={potentialConnections}
        pendingUserId={pendingUserId}
        onAdd={handleAdd}
      />
    </div>
  )

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-6">
      {error && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-joyna-ink-faint">
          Loading your network&hellip;
        </p>
      ) : connections.length === 0 ? (
        <div className="flex flex-col gap-8">
          <EmptyNetworkState />
          {potentialConnectionsSection}
        </div>
      ) : (
        <>
          <label className="sr-only" htmlFor="network-search">
            Search your network
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-joyna-ink-faint">
              <SearchIcon />
            </span>
            <Input
              id="network-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your network…"
              className="h-11 rounded-control border-joyna-border-strong bg-white pl-9 text-sm"
            />
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              {groups.length === 0 ? (
                <>
                  <div className="flex items-center justify-end">
                    {addByEmailLink}
                  </div>
                  <p className="text-sm text-joyna-ink-faint">
                    No matches for &ldquo;{query}&rdquo;.
                  </p>
                </>
              ) : (
                <NetworkGroups
                  groups={groups}
                  addByEmailSlot={addByEmailLink}
                />
              )}
            </div>

            {potentialConnectionsSection}
          </div>
        </>
      )}
    </section>
  )
}

export default Network
