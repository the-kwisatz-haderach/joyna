import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'

import { NotificationRow, type AppNotification } from '../../components/joyna/notification-item'
import { Pagination } from '../../components/joyna/pagination'

type NotificationsResponse = {
  notifications: AppNotification[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/notifications?page=${page}`, {
          credentials: 'include',
        })
        if (!response.ok) {
          return
        }
        const data = (await response.json()) as NotificationsResponse
        if (!cancelled) {
          setNotifications(data.notifications)
          setTotalPages(data.totalPages)
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
  }, [page])

  if (isLoading) {
    return (
      <p className="px-6 py-16 text-center text-sm text-joyna-ink-faint">Loading notifications…</p>
    )
  }

  if (notifications.length === 0) {
    return <EmptyState />
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-2 px-5 py-2">
      <div className="flex flex-col divide-y divide-joyna-border">
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </section>
  )
}

export default Notifications
