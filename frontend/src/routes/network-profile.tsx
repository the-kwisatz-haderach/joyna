import { useEffect, useState } from "react"
import { useNavigate, useParams, Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserRemove01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { GuestAvatar } from "../../components/joyna/guest-avatar"
import { Pill } from "../../components/joyna/pill"

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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" })
  if (!response.ok) {
    throw new Error(`failed to load ${url}`)
  }
  return (await response.json()) as T
}

function eventsTogetherLabel(count: number): string {
  return `${count} ${count === 1 ? "event" : "events"} together`
}

function NetworkProfile() {
  const { contactId } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<NetworkConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const connections = await fetchJson<NetworkConnection[]>("/api/network")
        if (cancelled) return
        setContact(connections.find((c) => c.contactId === contactId) ?? null)
      } catch {
        if (!cancelled) {
          setError("Couldn't load this contact. Please try again later.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [contactId])

  async function handleRemove() {
    if (!contact) return
    setIsRemoving(true)
    setError(null)
    try {
      const response = await fetch(`/api/network/${contact.contactId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("failed to remove connection")
      }
      navigate("/network")
    } catch {
      setError("Couldn't remove this person from your network. Please try again.")
      setIsRemoving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-6">
        <p className="text-sm text-joyna-ink-faint">Loading&hellip;</p>
      </section>
    )
  }

  if (!contact) {
    return (
      <section className="mx-auto flex max-w-sm flex-col gap-4 px-5 py-6">
        <p className="text-sm text-joyna-ink-faint">
          This person isn&apos;t in your network.
        </p>
        <Link to="/network" className="text-sm font-semibold text-joyna-coral">
          Back to network
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-6 font-body">
      <div className="flex flex-col items-center gap-3">
        <GuestAvatar name={contact.contactName} className="h-20 w-20 text-xl" />
        <div className="text-center">
          <p className="font-display text-lg font-semibold text-joyna-ink">
            {contact.contactName}
          </p>
          <p className="text-sm text-joyna-ink-soft">{contact.contactEmail}</p>
        </div>
        {contact.groupName && <Pill tone="periwinkle">{contact.groupName}</Pill>}
      </div>

      <div className="flex flex-col items-center gap-0.5 rounded-card border border-joyna-border bg-white py-3">
        <span className="font-display text-lg font-semibold text-joyna-ink">
          {contact.eventsTogetherCount}
        </span>
        <span className="text-[11px] text-joyna-ink-faint">
          {eventsTogetherLabel(contact.eventsTogetherCount)}
        </span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          {error}
        </p>
      )}

      <Button
        variant="destructive"
        className="h-11 w-full rounded-control font-display text-sm"
        onClick={() => setIsRemoveDialogOpen(true)}
      >
        <HugeiconsIcon icon={UserRemove01Icon} className="h-4 w-4" strokeWidth={2} />
        Remove from network
      </Button>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="max-w-[280px] rounded-2xl text-center font-body">
          <DialogHeader className="items-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-joyna-red/10">
              <HugeiconsIcon
                icon={UserRemove01Icon}
                className="h-5 w-5 text-joyna-red"
                strokeWidth={2}
              />
            </div>
            <DialogTitle className="font-display text-[15px]">
              Remove {contact.contactName}?
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              They&rsquo;ll be removed from your network. You can add them again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="h-11 w-full rounded-control font-display text-sm"
              disabled={isRemoving}
              onClick={handleRemove}
            >
              {isRemoving ? "Removing…" : "Remove from network"}
            </Button>
            <Button
              variant="secondary"
              className="h-11 w-full rounded-control font-display text-sm"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default NetworkProfile
