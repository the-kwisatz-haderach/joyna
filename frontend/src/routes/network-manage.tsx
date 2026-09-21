import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
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

type Group = {
  id: string
  ownerId: string
  name: string
  createdAt: string
  isFavorite: boolean
}

const DEFAULT_GROUP_NAME = "Acquaintances"

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" })
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

function FavoriteBadge() {
  return (
    <span aria-label="favorite" title="Favorite" className="text-joyna-sunflower-dark">
      ★
    </span>
  )
}

function matchesQuery(connection: NetworkConnection, query: string): boolean {
  if (!query.trim()) {
    return true
  }
  return connection.contactName.toLowerCase().includes(query.trim().toLowerCase())
}

function PersonChip({
  connection,
  onRemove,
}: {
  connection: NetworkConnection
  onRemove?: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData("text/plain", connection.contactId)
        event.dataTransfer.effectAllowed = "move"
      }}
      className="flex shrink-0 cursor-grab items-center gap-2 rounded-full border border-joyna-border bg-white py-1.5 pr-3 pl-1.5 active:cursor-grabbing"
    >
      <GuestAvatar name={connection.contactName} className="h-7 w-7" />
      <span className="text-sm font-semibold whitespace-nowrap text-joyna-ink">
        {connection.contactName}
      </span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${connection.contactName}`}
          onClick={onRemove}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-joyna-red/20 text-[10px] leading-none text-joyna-red-dark"
        >
          ×
        </button>
      )}
    </div>
  )
}

function GroupCard({
  group,
  members,
  onDrop,
  onRemoveMember,
}: {
  group: Group
  members: NetworkConnection[]
  onDrop: (contactId: string) => void
  onRemoveMember: (contactId: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      role="group"
      aria-label={group.name}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragOver(false)
        const contactId = event.dataTransfer.getData("text/plain")
        if (contactId) {
          onDrop(contactId)
        }
      }}
      className={cn(
        "flex flex-col gap-3 rounded-card border p-4 transition-colors",
        isDragOver
          ? "border-joyna-periwinkle-dark border-dashed bg-joyna-periwinkle/5"
          : "border-joyna-border bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-joyna-ink">
          {group.name}
          {group.isFavorite && <FavoriteBadge />}
        </h3>
        <span className="shrink-0 text-xs text-joyna-ink-faint">
          {members.length} {members.length === 1 ? "person" : "people"}
        </span>
      </div>
      {members.length === 0 ? (
        <p className="text-xs text-joyna-ink-faint">Drag someone here to add them.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <PersonChip
              key={member.contactId}
              connection={member}
              onRemove={() => onRemoveMember(member.contactId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NetworkManage() {
  const [connections, setConnections] = useState<NetworkConnection[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [newGroupName, setNewGroupName] = useState("")
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isUnassignedDragOver, setIsUnassignedDragOver] = useState(false)

  async function loadAll() {
    setError(null)
    try {
      const [ownConnections, ownGroups] = await Promise.all([
        fetchJson<NetworkConnection[]>("/api/network"),
        fetchJson<Group[]>("/api/groups"),
      ])
      setConnections(ownConnections)
      setGroups([...ownGroups].sort((a, b) => a.name.localeCompare(b.name)))
    } catch {
      setError("Couldn't load your network. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function moveContact(contactId: string, groupId: string | null) {
    setError(null)
    try {
      const response = await fetch(`/api/network/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groupId: groupId ?? "" }),
      })
      if (!response.ok) {
        throw new Error("failed to move contact")
      }
      const updated = (await response.json()) as NetworkConnection
      setConnections((prev) =>
        prev.map((connection) =>
          connection.contactId === updated.contactId ? updated : connection,
        ),
      )
    } catch {
      setError("Couldn't move that person. Please try again.")
    }
  }

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault()
    const name = newGroupName.trim()
    if (!name) {
      return
    }
    setIsCreatingGroup(true)
    setError(null)
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        throw new Error("failed to create group")
      }
      const created = (await response.json()) as Group
      setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewGroupName("")
    } catch {
      setError("Couldn't create that group. Please try again.")
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const unassigned = useMemo(
    () =>
      connections
        .filter((connection) => !connection.groupId)
        .filter((connection) => matchesQuery(connection, query)),
    [connections, query],
  )

  const membersByGroupId = useMemo(() => {
    const map = new Map<string, NetworkConnection[]>()
    for (const connection of connections) {
      if (!connection.groupId) {
        continue
      }
      const existing = map.get(connection.groupId)
      if (existing) {
        existing.push(connection)
      } else {
        map.set(connection.groupId, [connection])
      }
    }
    return map
  }, [connections])

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6 pb-24">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-semibold text-joyna-ink">Manage network</h1>
        <p className="text-sm text-joyna-ink-faint">
          Drag a person onto a group below to move them. Each person belongs to one group at a
          time.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-joyna-ink-faint">Loading your network&hellip;</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold tracking-wide text-joyna-ink-faint uppercase">
                {DEFAULT_GROUP_NAME}
              </h2>
              <Link to="/network/add" className="text-sm font-semibold text-joyna-coral">
                + Add by email
              </Link>
            </div>

            <label className="sr-only" htmlFor="manage-network-filter">
              Filter people
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-joyna-ink-faint">
                <SearchIcon />
              </span>
              <Input
                id="manage-network-filter"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter people…"
                className="h-11 rounded-control border-joyna-border-strong bg-white pl-9 text-sm"
              />
            </div>

            <div
              role="group"
              aria-label={DEFAULT_GROUP_NAME}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
                setIsUnassignedDragOver(true)
              }}
              onDragLeave={() => setIsUnassignedDragOver(false)}
              onDrop={(event) => {
                event.preventDefault()
                setIsUnassignedDragOver(false)
                const contactId = event.dataTransfer.getData("text/plain")
                if (contactId) {
                  moveContact(contactId, null)
                }
              }}
              className={cn(
                "flex gap-2 overflow-x-auto rounded-control p-1 transition-colors",
                isUnassignedDragOver && "bg-joyna-periwinkle/10",
              )}
            >
              {unassigned.length === 0 ? (
                <p className="py-2 text-sm text-joyna-ink-faint">
                  {query.trim() ? `No matches for “${query.trim()}”.` : "Everyone's in a group."}
                </p>
              ) : (
                unassigned.map((connection) => (
                  <PersonChip key={connection.contactId} connection={connection} />
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCreateGroup} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="new-group-name">
              New group name
            </label>
            <Input
              id="new-group-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="+ New group name…"
              className="h-11 flex-1 rounded-control border-dashed border-joyna-border-strong bg-white text-sm"
            />
            <button
              type="submit"
              aria-label="Create group"
              disabled={!newGroupName.trim() || isCreatingGroup}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-joyna-mint/20 transition-transform active:scale-90 disabled:opacity-50"
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                className="h-4 w-4 text-joyna-mint-dark"
                strokeWidth={2.5}
              />
            </button>
          </form>

          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                members={membersByGroupId.get(group.id) ?? []}
                onDrop={(contactId) => moveContact(contactId, group.id)}
                onRemoveMember={(contactId) => moveContact(contactId, null)}
              />
            ))}
          </div>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t border-joyna-border bg-joyna-cream px-5 py-4">
        <Link
          to="/network"
          className="flex h-11 flex-1 items-center justify-center rounded-control border border-joyna-border-strong bg-white font-display text-sm font-semibold text-joyna-ink"
        >
          Cancel
        </Link>
        <Link
          to="/network"
          className="flex h-11 flex-1 items-center justify-center rounded-control bg-joyna-coral font-display text-sm font-semibold text-white"
        >
          Done
        </Link>
      </div>
    </section>
  )
}

export default NetworkManage
