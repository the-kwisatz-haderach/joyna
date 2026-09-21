import { formatRelativeTime } from '@/lib/format-relative-time'
import { cn } from '@/lib/utils'

export type NotificationType =
  | 'event_invite'
  | 'event_uninvite'
  | 'invite_response'
  | 'event_updated'
  | 'rsvp_deadline_reminder'
  | 'event_starting_today'

export type AppNotification = {
  id: string
  type: NotificationType
  eventId?: string
  eventName?: string
  actorId?: string
  actorName?: string
  status?: 'accepted' | 'declined'
  isRead: boolean
  createdAt: string
}

function describeNotification(notification: AppNotification): string {
  const actor = notification.actorName ?? 'Someone'
  switch (notification.type) {
    case 'event_invite':
      return `${actor} invited you to an event`
    case 'event_uninvite':
      return `${actor} removed you from an event`
    case 'invite_response':
      return notification.status === 'declined'
        ? `${actor} can't make it`
        : `${actor} joined the event`
    case 'event_updated':
      return 'Event details were updated'
    case 'rsvp_deadline_reminder':
      return 'RSVP deadline is tomorrow'
    case 'event_starting_today':
      return 'This event is happening today'
  }
}

export function NotificationRow({ notification }: { notification: AppNotification }) {
  return (
    <div className="flex gap-3 py-4">
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          !notification.isRead && 'bg-joyna-coral',
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-display text-sm text-joyna-ink',
            notification.isRead ? 'font-medium' : 'font-semibold',
          )}
        >
          {notification.eventName ?? 'Event'}
        </p>
        <p className="mt-0.5 text-sm text-joyna-ink-soft">{describeNotification(notification)}</p>
        <p className="mt-1 text-xs text-joyna-ink-faint">{formatRelativeTime(notification.createdAt)}</p>
      </div>
    </div>
  )
}
