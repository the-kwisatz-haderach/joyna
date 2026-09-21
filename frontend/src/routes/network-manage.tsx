import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { GuestAvatar } from "../../components/joyna/guest-avatar"

type ManagedConnection = {
  contactId: string
  contactName: string
  groupId?: string
}

type ManagedGroup = {
  id: string
  name: string
  isFavorite: boolean
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" })
  if (!response.ok) {
    throw new Error(`failed to load ${url}`)
  }
  return (await response.json()) as T
}

function matchesFilter(name: string, query: string): boolean {
  if (!query.trim()) {
    return true
  }
  return name.toLowerCase().includes(query.trim().toLowerCase())
}

function joinNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join("")
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

function describeGroupDeletion(memberNames: string[]): string {
  if (memberNames.length === 0) {
    return "This can't be undone."
  }
  return `${joinNames(memberNames)} will move to Acquaintances. This can't be undone.`
}

function PersonChip({
  name,
  draggable,
  isDragging,
  onDragStart,
  onDragEnd,
  onRemove,
}: {
  name: string
  draggable?: boolean
  isDragging?: boolean
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onRemove?: () => void
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border border-joyna-border bg-white py-1 pr-1.5 pl-1 select-none",
        isDragging && "border-2 border-dashed border-joyna-periwinkle opacity-60",
      )}
    >
      <GuestAvatar name={name} />
      <span className="text-xs font-semibold text-joyna-ink">{name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name} from group`}
          onClick={onRemove}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-joyna-red/10 transition-transform active:scale-90"
        >
          <HugeiconsIcon
            icon={Cancel01Icon}
            className="h-2.5 w-2.5 text-joyna-red"
            strokeWidth={2.5}
          />
        </button>
      )}
    </div>
  )
}

function NetworkManage() {
  const [connections, setConnections] = useState<ManagedConnection[]>([])
  const [groups, setGroups] = useState<ManagedGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [peopleFilter, setPeopleFilter] = useState("")
  const [newGroupName, setNewGroupName] = useState("")
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [groupPendingDeletion, setGroupPendingDeletion] = useState<ManagedGroup | null>(null)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)

  useEffect(() => {
    async function load() {
      setError(null)
      try {
        const [network, groupList] = await Promise.all([
          fetchJson<{ contactId: string; contactName: string; groupId?: string }[]>(
            "/api/network",
          ),
          fetchJson<ManagedGroup[]>("/api/groups"),
        ])
        setConnections(
          network.map(({ contactId, contactName, groupId }) => ({
            contactId,
            contactName,
            groupId,
          })),
        )
        setGroups(groupList)
      } catch {
        setError("Couldn't load your network. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const acquaintances = useMemo(
    () =>
      connections
        .filter((connection) => !connection.groupId)
        .filter((connection) => matchesFilter(connection.contactName, peopleFilter)),
    [connections, peopleFilter],
  )

  const groupsWithMembers = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        members: connections.filter((connection) => connection.groupId === group.id),
      })),
    [groups, connections],
  )

  async function moveContactToGroup(contactId: string, groupId: string | undefined) {
    setError(null)
    const previous = connections
    setConnections((current) =>
      current.map((connection) =>
        connection.contactId === contactId ? { ...connection, groupId } : connection,
      ),
    )
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
    } catch {
      setConnections(previous)
      setError("Couldn't move that person. Please try again.")
    }
  }

  function handleDragStart(contactId: string) {
    return (e: DragEvent<HTMLDivElement>) => {
      setDraggedContactId(contactId)
      e.dataTransfer?.setData?.("text/plain", contactId)
    }
  }

  function handleDragEnd() {
    setDraggedContactId(null)
    setDragOverGroupId(null)
  }

  function handleDrop(groupId: string | undefined) {
    return (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (draggedContactId) {
        moveContactToGroup(draggedContactId, groupId)
      }
      setDraggedContactId(null)
      setDragOverGroupId(null)
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function handleGroupDragEnter(groupId: string) {
    return (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOverGroupId(groupId)
    }
  }

  function handleGroupDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOverGroupId(null)
    }
  }

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault()
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
      const created = (await response.json()) as ManagedGroup
      setGroups((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewGroupName("")
    } catch {
      setError("Couldn't create that group. Please try again.")
    } finally {
      setIsCreatingGroup(false)
    }
  }

  async function handleDeleteGroup(group: ManagedGroup) {
    setIsDeletingGroup(true)
    setError(null)
    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("failed to delete group")
      }
      setGroups((current) => current.filter((candidate) => candidate.id !== group.id))
      setConnections((current) =>
        current.map((connection) =>
          connection.groupId === group.id ? { ...connection, groupId: undefined } : connection,
        ),
      )
      setGroupPendingDeletion(null)
    } catch {
      setError("Couldn't delete that group. Please try again.")
    } finally {
      setIsDeletingGroup(false)
    }
  }

  const membersOfGroupPendingDeletion = groupPendingDeletion
    ? connections
        .filter((connection) => connection.groupId === groupPendingDeletion.id)
        .map((connection) => connection.contactName)
    : []

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6">
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
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold tracking-wide text-joyna-ink-faint uppercase">
                Acquaintances
              </h2>
              <Link to="/network/add" className="text-sm font-semibold text-joyna-coral">
                + Add by email
              </Link>
            </div>

            <label className="sr-only" htmlFor="people-filter">
              Filter people
            </label>
            <Input
              id="people-filter"
              type="search"
              value={peopleFilter}
              onChange={(e) => setPeopleFilter(e.target.value)}
              placeholder="Filter people…"
              className="h-11 rounded-control border-joyna-border-strong bg-white text-sm"
            />

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop(undefined)}
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {acquaintances.length === 0 ? (
                <p className="text-sm text-joyna-ink-faint">
                  {connections.filter((c) => !c.groupId).length === 0
                    ? "No one here yet."
                    : `No matches for “${peopleFilter}”.`}
                </p>
              ) : (
                acquaintances.map((contact) => (
                  <PersonChip
                    key={contact.contactId}
                    name={contact.contactName}
                    draggable
                    isDragging={draggedContactId === contact.contactId}
                    onDragStart={handleDragStart(contact.contactId)}
                    onDragEnd={handleDragEnd}
                  />
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-joyna-mint/20 transition-transform active:scale-95 disabled:opacity-50"
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                className="h-4 w-4 text-joyna-mint-dark"
                strokeWidth={2.5}
              />
            </button>
          </form>

          <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto p-1 -m-1">
            {groupsWithMembers.map((group) => (
              <div
                key={group.id}
                role="group"
                aria-label={group.name}
                onDragEnter={handleGroupDragEnter(group.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleGroupDragLeave}
                onDrop={handleDrop(group.id)}
                className={cn(
                  "flex flex-col gap-3 rounded-card border border-joyna-border bg-white p-4 transition-colors",
                  dragOverGroupId === group.id &&
                    "border-2 border-dashed border-joyna-periwinkle bg-joyna-periwinkle/5",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-sm font-semibold text-joyna-ink">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-joyna-ink-faint">
                      {group.members.length} {group.members.length === 1 ? "person" : "people"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete ${group.name}`}
                      onClick={() => setGroupPendingDeletion(group)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-joyna-red/10 transition-transform active:scale-90"
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        className="h-3.5 w-3.5 text-joyna-red"
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.members.length === 0 ? (
                    <p className="text-xs text-joyna-ink-faint">
                      Drag someone here to add them.
                    </p>
                  ) : (
                    group.members.map((member) => (
                      <PersonChip
                        key={member.contactId}
                        name={member.contactName}
                        draggable
                        isDragging={draggedContactId === member.contactId}
                        onDragStart={handleDragStart(member.contactId)}
                        onDragEnd={handleDragEnd}
                        onRemove={() => moveContactToGroup(member.contactId, undefined)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={groupPendingDeletion !== null}
        onOpenChange={(open) => !open && setGroupPendingDeletion(null)}
      >
        <DialogContent className="max-w-[280px] rounded-2xl text-center font-body">
          <DialogHeader className="items-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-joyna-red/10">
              <HugeiconsIcon icon={Delete02Icon} className="h-5 w-5 text-joyna-red" strokeWidth={2} />
            </div>
            <DialogTitle className="font-display text-[15px]">
              Delete &ldquo;{groupPendingDeletion?.name}&rdquo;?
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              {describeGroupDeletion(membersOfGroupPendingDeletion)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="h-11 w-full rounded-control font-display text-sm"
              disabled={isDeletingGroup}
              onClick={() => groupPendingDeletion && handleDeleteGroup(groupPendingDeletion)}
            >
              {isDeletingGroup ? "Deleting…" : "Delete group"}
            </Button>
            <Button
              variant="secondary"
              className="h-11 w-full rounded-control font-display text-sm"
              onClick={() => setGroupPendingDeletion(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default NetworkManage
