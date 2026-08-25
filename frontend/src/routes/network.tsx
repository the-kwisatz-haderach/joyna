import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

type NetworkConnection = {
  contactId: string
  contactName: string
  contactEmail: string
  isFavorite: boolean
  groupId?: string
  groupName?: string
  groupIsFavorite?: boolean
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
    <span aria-label="favorite" title="Favorite" className="text-amber-500">
      ★
    </span>
  )
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

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function CurrentNetwork({ connections }: { connections: NetworkConnection[] }) {
  if (connections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Your network is empty. Add people from your potential network below.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groupConnections(connections).map((group) => (
        <div key={group.name} className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {group.name}
            {group.isFavorite && <FavoriteBadge />}
          </h3>
          <ul className="flex flex-col gap-2">
            {group.members.map((member) => (
              <li
                key={member.contactId}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
              >
                <div>
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    {member.contactName}
                    {member.isFavorite && <FavoriteBadge />}
                  </p>
                  <p className="text-muted-foreground">{member.contactEmail}</p>
                </div>
              </li>
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
  if (potentialConnections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No one new to add yet — attend an event with someone to see them here.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {potentialConnections.map((candidate) => (
        <li
          key={candidate.userId}
          className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
        >
          <div>
            <p className="font-medium text-foreground">{candidate.name}</p>
            <p className="text-muted-foreground">
              {candidate.sharedEventCount}{" "}
              {candidate.sharedEventCount === 1 ? "shared event" : "shared events"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
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
    <section className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Your network
        </h1>
        <p className="text-muted-foreground">
          See who&apos;s in your network and who you&apos;ve crossed paths with.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your network&hellip;</p>
      ) : (
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium text-foreground">
              Current network
            </h2>
            <CurrentNetwork connections={connections} />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium text-foreground">
              Potential network
            </h2>
            <PotentialNetwork
              potentialConnections={potentialConnections}
              pendingUserId={pendingUserId}
              onAdd={handleAdd}
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default Network
