import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'

import { NotificationRow, type AppNotification } from '../../components/joyna/notification-item'

function EmptyState() {
  return (
    <section className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-20 text-center font-body">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-joyna-mint/15 text-joyna-mint-dark">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-8 w-8" strokeWidth={1.8} />
      </div>
      <h2 className="font-display text-lg font-semibold text-joyna-ink">You&rsquo;re all caught up</h2>
      <p className="text-sm text-joyna-ink-soft">Notifications about your events will show up here.</p>
    </section>
  )
}

function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      try {
        const response = await fetch('/api/notifications', {
          credentials: 'include',
        })
        if (!response.ok) {
          return
        }
        const data = (await response.json()) as AppNotification[]
        if (!cancelled) {
          setNotifications(data)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadNotifications()
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <p className="px-6 py-16 text-center text-sm text-joyna-ink-faint">Loading notifications…</p>
    )
  }

  if (notifications.length === 0) {
    return <EmptyState />
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col divide-y divide-joyna-border px-5 py-2">
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
    </section>
  )
}

export default Notifications
