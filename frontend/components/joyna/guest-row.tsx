import type {ReactNode} from 'react'
import {HugeiconsIcon} from '@hugeicons/react'
import {
  Cancel01Icon,
  UserAdd01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import {GuestAvatar} from './guest-avatar'
import {HostBadge} from './host-badge'
import {cn} from '@/lib/utils'

export type GuestStatus = 'going' | 'pending' | 'not_attending'

export interface Guest {
  id: string
  name: string
  isHost?: boolean
  status?: GuestStatus
  /** Network group name (e.g. "Bandmates"). `null` = outside the viewer's network. */
  group?: string | null
  /** Optional decline reason, shown under the name for not_attending guests. */
  reason?: string
  avatarSrc?: string
  /**
   * Name to derive avatar initials from, when it differs from the
   * displayed `name` (e.g. the viewer's own row shows "You" but the
   * avatar should still reflect their real name). Defaults to `name`.
   */
  avatarName?: string
}

interface GuestRowProps {
  guest: Guest
  /** Screen is in "unlocked" edit mode — shows a remove control instead of status/group text. */
  editable?: boolean
  /** Transient state right after tapping "Add to network", before `group` resolves. */
  justAddedToNetwork?: boolean
  onRemove?: (id: string) => void
  onAddToNetwork?: (id: string) => void
}

/**
 * Renders one row of the Guest list. Trailing content depends on state,
 * in this priority order:
 *   1. host                → nothing
 *   2. editable (unlocked) → remove (×) button
 *   3. justAddedToNetwork  → "Added" chip (non-interactive)
 *   4. group === null      → "Add" to-network button (locked-state only)
 *   5. otherwise           → muted group-name text
 */
export function GuestRow({
  guest,
  editable = false,
  justAddedToNetwork = false,
  onRemove,
  onAddToNetwork,
}: GuestRowProps) {
  const isStranger = !guest.isHost && guest.group === null

  const avatarVariant = guest.isHost
    ? 'host'
    : justAddedToNetwork
      ? 'network-added'
      : isStranger
        ? 'stranger'
        : 'default'

  let trailing: ReactNode = null
  if (guest.isHost) {
    trailing = null
  } else if (editable) {
    trailing = (
      <button
        type="button"
        aria-label={`Remove ${guest.name}`}
        onClick={() => onRemove?.(guest.id)}
        className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-joyna-red/10 active:scale-90 transition-transform"
      >
        <HugeiconsIcon
          icon={Cancel01Icon}
          className="h-3 w-3 text-joyna-red"
          strokeWidth={2.5}
        />
      </button>
    )
  } else if (justAddedToNetwork) {
    trailing = (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-joyna-mint/20 px-2.5 py-1 text-[10.5px] font-semibold text-joyna-mint-dark">
        <HugeiconsIcon
          icon={Tick02Icon}
          className="h-3 w-3"
          strokeWidth={2.5}
        />{' '}
        Added
      </span>
    )
  } else if (isStranger) {
    trailing = (
      <button
        type="button"
        onClick={() => onAddToNetwork?.(guest.id)}
        className="flex shrink-0 items-center gap-1 rounded-full bg-joyna-periwinkle/10 px-2.5 py-1 text-[10.5px] font-semibold text-joyna-periwinkle-dark"
      >
        <HugeiconsIcon
          icon={UserAdd01Icon}
          className="h-3 w-3"
          strokeWidth={2.2}
        />{' '}
        Add
      </button>
    )
  } else if (guest.group) {
    trailing = (
      <span className="text-[11px] text-joyna-ink-faint whitespace-nowrap">
        {guest.group}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 py-2 text-sm',
        guest.reason && 'items-start',
      )}
    >
      <GuestAvatar
        name={guest.avatarName ?? guest.name}
        variant={avatarVariant}
        src={guest.avatarSrc}
      />
      {guest.reason ? (
        <div className="flex-1">
          <div className="flex items-center">
            <span className="flex-1">{guest.name}</span>
            {trailing}
          </div>
          <div className="mt-0.5 text-[11.5px] italic text-joyna-ink-faint">
            &ldquo;{guest.reason}&rdquo;
          </div>
        </div>
      ) : (
        <>
          <span
            className={cn(
              'flex items-center gap-1.5',
              !guest.isHost && 'flex-1',
            )}
          >
            {guest.name}
            {guest.isHost && <HostBadge />}
          </span>
          {trailing}
        </>
      )}
    </div>
  )
}

/** Small caption used above a status cluster: "Pending" / "Not attending" */
export function GuestGroupLabel({children}: {children: React.ReactNode}) {
  return (
    <div className="mt-3 mb-1 text-xs font-semibold text-joyna-ink-faint">
      {children}
    </div>
  )
}

/**
 * No entry for "going" — attending guests are listed directly below the
 * host without a heading, so only "pending"/"not_attending" get a label.
 */
export const STATUS_LABEL: Partial<Record<GuestStatus, string>> = {
  pending: 'Pending',
  not_attending: 'Not attending',
}

export const STATUS_ORDER: GuestStatus[] = ['going', 'pending', 'not_attending']
