import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GuestAvatar } from "../../components/joyna/guest-avatar"

type NetworkConnection = {
  contactId: string
  contactName: string
  contactEmail: string
  isFavorite: boolean
  groupId?: string
  groupName?: string
  groupIsFavorite?: boolean
  eventsTogetherCount: number
}

type PotentialConnection = {
  userId: string
  name: string
  email: string
  sharedEventCount: number
}

const DEFAULT_GROUP_NAME = "Acquaintances"

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" })
  if (!response.ok) {
    throw new Error(`failed to load ${url}`)
  }
  return (await response.json()) as T
}

function FavoriteBadge() {
  return (
    <span aria-label="favorite" title="Favorite" className="text-joyna-sunflower-dark">
      ★
    </span>
  )
}

function eventsTogetherLabel(count: number): string {
  return `${count} ${count === 1 ? "event" : "events"} together`
}

function matchesQuery(connection: NetworkConnection, query: string): boolean {
  if (!query) {
    return true
  }
  const needle = query.trim().toLowerCase()
  const groupName = (connection.groupName ?? DEFAULT_GROUP_NAME).toLowerCase()
  return connection.contactName.toLowerCase().includes(needle) || groupName.includes(needle)
}

function groupConnections(connections: NetworkConnection[]) {
  const groups = new Map<
    string,
    { name: string; isFavorite: boolean; members: NetworkConnection[] }
  >()

  for (const connection of connections) {
    const key = connection.groupId ?? "default"
    const existing = groups.get(key)
    if (existing) {
      existing.members.push(connection)
    } else {
      groups.set(key, {
        name: connection.groupName ?? DEFAULT_GROUP_NAME,
        isFavorite: connection.groupIsFavorite ?? false,
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

function ContactRow({ contact }: { contact: NetworkConnection }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-card border border-joyna-border bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        <GuestAvatar name={contact.contactName} />
        <span className="flex items-center gap-1.5 truncate font-display text-sm font-semibold text-joyna-ink">
          {contact.contactName}
          {contact.isFavorite && <FavoriteBadge />}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs text-joyna-ink-faint">
        {eventsTogetherLabel(contact.eventsTogetherCount)}
        <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" strokeWidth={2} />
      </div>
    </li>
  )
}

function NetworkGroups({ groups }: { groups: ReturnType<typeof groupConnections> }) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.name} className="flex flex-col gap-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-joyna-ink-faint uppercase">
            {group.name}
            {group.isFavorite && <FavoriteBadge />}
          </h3>
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
    <ul className="flex flex-col gap-2">
      {potentialConnections.map((candidate) => (
        <li
          key={candidate.userId}
          className="flex items-center justify-between gap-3 rounded-card border border-joyna-border bg-white p-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <GuestAvatar name={candidate.name} />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-joyna-ink">
                {candidate.name}
              </p>
              <p className="truncate text-xs text-joyna-ink-faint">
                {eventsTogetherLabel(candidate.sharedEventCount)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-control"
            disabled={pendingUserId === candidate.userId}
            onClick={() => onAdd(candidate.userId)}
          >
            {pendingUserId === candidate.userId ? "Adding…" : "Add"}
          </Button>
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
  const [query, setQuery] = useState("")

  async function loadNetwork() {
    setError(null)
    try {
      const [currentNetwork, potential] = await Promise.all([
        fetchJson<NetworkConnection[]>("/api/network"),
        fetchJson<PotentialConnection[]>("/api/network/potential"),
      ])
      setConnections(currentNetwork)
      setPotentialConnections(potential)
    } catch {
      setError("Couldn't load your network. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNetwork()
  }, [])

  const groups = useMemo(
    () => groupConnections(connections.filter((connection) => matchesQuery(connection, query))),
    [connections, query],
  )

  async function handleAdd(userId: string) {
    setPendingUserId(userId)
    setError(null)
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contactId: userId }),
      })
      if (!response.ok) {
        throw new Error("failed to add connection")
      }
      await loadNetwork()
    } catch {
      setError("Couldn't add that person to your network. Please try again.")
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-6">
      <label className="sr-only" htmlFor="network-search">
        Search your network
      </label>
      <Input
        id="network-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your network…"
        className="h-11 rounded-control bg-white"
      />

      {error && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-joyna-ink-faint">Loading your network&hellip;</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-end">
              <Link
                to="/network/add"
                className="text-sm font-semibold text-joyna-coral"
              >
                + Add by email
              </Link>
            </div>

            {connections.length === 0 ? (
              <p className="text-sm text-joyna-ink-faint">
                Your network is empty. Add someone by email, or check the
                suggestions below.
              </p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-joyna-ink-faint">
                No matches for &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <NetworkGroups groups={groups} />
            )}
          </div>

          {potentialConnections.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-base font-semibold text-joyna-ink">
                People you may know
              </h2>
              <PotentialNetwork
                potentialConnections={potentialConnections}
                pendingUserId={pendingUserId}
                onAdd={handleAdd}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default Network
