import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GuestAvatar } from "../../components/joyna/guest-avatar"

type LookupResult = {
  userId: string
  name: string
  email: string
}

type LookupStatus = "idle" | "loading" | "found" | "not-found" | "error"

type NetworkGroupOption = {
  id: string
  name: string
}

// There's no GET /groups listing endpoint (yet) — the set of groups the
// caller has already created can be derived from the groups already attached
// to their connections, which /api/network returns.
async function fetchGroupOptions(): Promise<NetworkGroupOption[]> {
  const response = await fetch("/api/network", { credentials: "include" })
  if (!response.ok) {
    return []
  }
  const connections = (await response.json()) as {
    groupId?: string
    groupName?: string
  }[]
  const byId = new Map<string, string>()
  for (const connection of connections) {
    if (connection.groupId && connection.groupName) {
      byId.set(connection.groupId, connection.groupName)
    }
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function NetworkAdd() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<LookupStatus>("idle")
  const [result, setResult] = useState<LookupResult | null>(null)
  const [groupOptions, setGroupOptions] = useState<NetworkGroupOption[]>([])
  const [groupId, setGroupId] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    fetchGroupOptions().then(setGroupOptions)
  }, [])

  useEffect(() => {
    const trimmed = email.trim()
    setResult(null)
    setAddError(null)
    if (!trimmed) {
      setStatus("idle")
      return
    }

    let cancelled = false
    setStatus("loading")
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/network/lookup?email=${encodeURIComponent(trimmed)}`,
          { credentials: "include" },
        )
        if (cancelled) return
        if (response.status === 404) {
          setStatus("not-found")
          return
        }
        if (!response.ok) {
          setStatus("error")
          return
        }
        setResult((await response.json()) as LookupResult)
        setStatus("found")
      } catch {
        if (!cancelled) {
          setStatus("error")
        }
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [email])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Not-found state has nothing to add yet — "Invite to Joyna" is a dummy
    // button for now, so this is a no-op until that flow exists.
    if (!result) {
      return
    }

    setIsAdding(true)
    setAddError(null)
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contactId: result.userId, groupId: groupId || undefined }),
      })
      if (!response.ok) {
        throw new Error("failed to add connection")
      }
      navigate("/network")
    } catch {
      setAddError("Couldn't add that person to your network. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  const showCard = status === "found" || status === "not-found"

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6">
      <h1 className="font-display text-xl font-semibold text-joyna-ink">
        Add to your network
      </h1>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
        Email
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="priya@example.com"
          className="h-11 rounded-control bg-white"
          autoFocus
        />
      </label>

      {status === "loading" && (
        <p className="text-sm text-joyna-ink-faint">Searching&hellip;</p>
      )}
      {status === "error" && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          Couldn&apos;t search for that email. Please try again.
        </p>
      )}

      {showCard && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-card border border-joyna-border bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <GuestAvatar name={status === "found" ? result!.name : email.trim()} variant="stranger" />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-joyna-ink">
                {status === "found" ? result!.name : email.trim()}
              </p>
              {status === "found" && (
                <p className="truncate text-xs text-joyna-ink-faint">{result!.email}</p>
              )}
            </div>
          </div>

          {status === "found" ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
              Add to group (optional)
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="h-11 rounded-control border border-joyna-border bg-white px-3 text-sm text-joyna-ink"
              >
                <option value="">Acquaintances</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-joyna-ink-faint">
              No account with that email? You can invite them to Joyna instead.
            </p>
          )}

          {addError && (
            <p role="alert" className="text-sm text-joyna-red-dark">
              {addError}
            </p>
          )}

          <Button type="submit" disabled={isAdding} className="h-11 rounded-control font-display text-sm">
            {status === "found" ? (isAdding ? "Adding…" : "Add to network") : "Invite to Joyna"}
          </Button>
        </form>
      )}
    </section>
  )
}

export default NetworkAdd
