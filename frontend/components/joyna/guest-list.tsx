'use client'

import {useMemo, useState} from 'react'
import {HugeiconsIcon} from '@hugeicons/react'
import {PlusSignIcon, UserMultipleIcon} from '@hugeicons/core-free-icons'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {
  GuestRow,
  GuestGroupLabel,
  STATUS_ORDER,
  STATUS_LABEL,
  type Guest,
} from './guest-row'
import {GuestAvatar} from './guest-avatar'
import {StickyActionBar} from './sticky-action-bar'
import {ConfirmRemoveDialog} from './confirm-remove-dialog'

export interface NetworkCandidate {
  id: string
  name: string
  group: string
}

interface GuestListProps {
  eventTitle: string
  /** Current committed guest list (host + invitees). */
  guests: Guest[]
  /** People available to add via "Add from group" while unlocked. */
  candidates: NetworkCandidate[]
  /** Called with the full new guest list when the host taps "Done". */
  onCommit: (guests: Guest[]) => Promise<void> | void
  /** Called when a stranger's "Add" (to network) button is tapped. */
  onAddToNetwork?: (guestId: string) => Promise<void> | void
  /**
   * If true, editing is disabled entirely (e.g. RSVP deadline passed) —
   * renders a static lock indicator and no "Update guest list" bar.
   */
  readOnly?: boolean
  /**
   * While unlocked, controls whether a given guest's row gets a remove (×)
   * icon at all — the host can remove anyone, but a non-host viewer can
   * only remove guests they personally invited. Defaults to "anyone",
   * matching host behavior.
   */
  canRemove?: (guest: Guest) => boolean
}

/**
 * This is the ONE component for both the "locked" and "unlocked" guest
 * list states — it never navigates anywhere. Tapping "Update guest list"
 * flips local state; Cancel discards the draft, Done calls onCommit with
 * the edited list.
 */
export function GuestList({
  eventTitle,
  guests,
  candidates,
  onCommit,
  onAddToNetwork,
  readOnly = false,
  canRemove = () => true,
}: GuestListProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Guest[]>(guests)
  const [filter, setFilter] = useState('')
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [pendingRemoval, setPendingRemoval] = useState<Guest | null>(null)

  const list = editing ? draft : guests
  const host = list.find((g) => g.isHost)

  const grouped = useMemo(() => {
    const groups: Record<string, Guest[]> = {
      going: [],
      pending: [],
      not_attending: [],
    }
    list
      .filter((g) => !g.isHost)
      .forEach((g) => {
        if (g.status) groups[g.status].push(g)
      })
    return groups
  }, [list])

  const availableCandidates = useMemo(
    () =>
      candidates.filter(
        (c) =>
          !draft.some((g) => g.id === c.id) &&
          c.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [candidates, draft, filter],
  )

  function enterEdit() {
    setDraft(guests)
    setFilter('')
    setEditing(true)
  }
  function cancelEdit() {
    setEditing(false)
  }
  async function commitEdit() {
    await onCommit(draft)
    setEditing(false)
  }
  function requestRemove(id: string) {
    const guest = draft.find((g) => g.id === id) ?? null
    setPendingRemoval(guest)
  }
  function confirmRemove() {
    if (!pendingRemoval) return
    setDraft((d) => d.filter((g) => g.id !== pendingRemoval.id))
    setPendingRemoval(null)
  }
  function addCandidate(candidate: NetworkCandidate) {
    setDraft((d) => [
      ...d,
      {
        id: candidate.id,
        name: candidate.name,
        status: 'pending',
        group: candidate.group,
      },
    ])
  }
  async function handleAddToNetwork(id: string) {
    setJustAdded((s) => new Set(s).add(id))
    await onAddToNetwork?.(id)
    // Parent is expected to eventually update `guests` so this guest's
    // `group` resolves to a real name (e.g. "Acquaintances"); once that
    // prop change lands, GuestRow's normal branch takes over automatically.
    setTimeout(() => {
      setJustAdded((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
    }, 1200)
  }

  const hasAnyGuests = STATUS_ORDER.some((s) => grouped[s].length > 0)

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <h3 className="font-display text-base font-semibold">Guest list</h3>
        {readOnly && (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#A79FB0"
            strokeWidth={2}
          >
            <rect x="5" y="11" width="14" height="9" rx="2.5" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        )}
      </div>

      {host && <GuestRow guest={host} />}

      {!hasAnyGuests && !editing && (
        <div className="mt-1.5 flex flex-col items-center gap-1 rounded-2xl border-[1.5px] border-dashed border-joyna-border-strong py-5 text-center text-joyna-ink-faint bg-white">
          <HugeiconsIcon
            icon={UserMultipleIcon}
            className="h-7 w-7"
            strokeWidth={1.6}
          />
          <p className="text-xs">No one&rsquo;s invited yet</p>
        </div>
      )}

      {STATUS_ORDER.map(
        (status) =>
          grouped[status].length > 0 && (
            <div key={status}>
              {STATUS_LABEL[status] && (
                <GuestGroupLabel>{STATUS_LABEL[status]}</GuestGroupLabel>
              )}
              {grouped[status].map((g) => (
                <GuestRow
                  key={g.id}
                  guest={g}
                  editable={editing && canRemove(g)}
                  justAddedToNetwork={justAdded.has(g.id)}
                  onRemove={requestRemove}
                  onAddToNetwork={readOnly ? undefined : handleAddToNetwork}
                />
              ))}
            </div>
          ),
      )}

      {readOnly && (
        <p className="mt-2.5 text-[11px] text-joyna-ink-faint">
          RSVP deadline has passed — the guest list is now locked.
        </p>
      )}

      {editing && (
        <div className="mt-1">
          <GuestGroupLabel>Add from group</GuestGroupLabel>
          <Input
            placeholder="🔍 Filter people or groups…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-2 h-9 rounded-[10px] text-xs"
          />
          {availableCandidates.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 py-2 text-sm">
              <GuestAvatar name={c.name} />
              <span className="flex-1">{c.name}</span>
              <span className="text-[11px] text-joyna-ink-faint">
                {c.group}
              </span>
              <button
                type="button"
                aria-label={`Add ${c.name}`}
                onClick={() => addCandidate(c)}
                className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-joyna-mint/20 active:scale-90 transition-transform"
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  className="h-3 w-3 text-joyna-mint-dark"
                  strokeWidth={2.5}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {!readOnly &&
        (editing ? (
          <StickyActionBar className="sticky bottom-0 z-10 mt-4 -mx-5 px-5">
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-control font-display text-sm"
              onClick={cancelEdit}
            >
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 rounded-control font-display text-sm"
              onClick={commitEdit}
            >
              Done
            </Button>
          </StickyActionBar>
        ) : (
          <StickyActionBar className="sticky bottom-0 z-10 mt-4 -mx-5 px-5">
            <Button
              className="h-11 w-full rounded-control font-display text-sm"
              onClick={enterEdit}
            >
              {hasAnyGuests ? 'Update guest list' : 'Add guests'}
            </Button>
          </StickyActionBar>
        ))}

      <ConfirmRemoveDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        guestName={pendingRemoval?.name ?? ''}
        eventTitle={eventTitle}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
