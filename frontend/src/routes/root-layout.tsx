import {useEffect, useState} from 'react'
import {Link, Outlet, useLocation} from 'react-router'
import {HugeiconsIcon} from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  Notification03Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons'

import {cn} from '@/lib/utils'
import {useHideOnScroll} from '@/hooks/use-hide-on-scroll'
import {useAuth} from '../auth-context'

// Refetched on every route change so the badge clears shortly after a visit
// to /notifications (which marks everything read server-side) moves the
// unread count back to 0.
function useUnreadNotificationsCount(pathname: string): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadUnreadCount() {
      try {
        const response = await fetch('/api/notifications/unread-count', {
          credentials: 'include',
        })
        if (!response.ok) {
          return
        }
        const data = (await response.json()) as {count: number}
        if (!cancelled) {
          setCount(data.count)
        }
      } catch {
        // Leave the previous count in place on network errors.
      }
    }

    loadUnreadCount()
    return () => {
      cancelled = true
    }
  }, [pathname])

  return count
}

function isPushedPath(pathname: string): boolean {
  return Boolean(getBackTarget(pathname))
}

// Pushed screens show a "‹ <label>" back link (to <to>) instead of a static
// title, and hide the bottom nav — see isPushedPath/showBottomMenu below.
function getBackTarget(pathname: string): {to: string; label: string} | null {
  if (
    pathname === '/events/new' ||
    /^\/events\/[^/]+\/edit$/.test(pathname) ||
    (pathname !== '/events/all' && /^\/events\/[^/]+$/.test(pathname))
  ) {
    return {to: '/events', label: 'Events'}
  }
  if (pathname === '/network/add' || /^\/network\/[^/]+$/.test(pathname)) {
    return {to: '/network', label: 'Network'}
  }
  if (pathname === '/profile/edit') {
    return {to: '/profile', label: 'Profile'}
  }
  return null
}

function getScreenTitle(pathname: string): string {
  if (pathname === '/notifications') return 'Notifications'
  if (pathname === '/profile') return 'Profile'
  if (pathname === '/network') return 'Network'
  return 'Events'
}

function TopMenu() {
  const {pathname} = useLocation()
  const backTarget = getBackTarget(pathname)
  const hidden = useHideOnScroll()
  const unreadCount = useUnreadNotificationsCount(pathname)
  const showUnreadBadge = unreadCount > 0 && pathname !== '/notifications'
  const profileActive = pathname === '/profile' || pathname === '/profile/edit'

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex items-center justify-between border-b border-joyna-border bg-joyna-cream px-5 py-4 transition-transform duration-300 ease-in-out',
        hidden ? '-translate-y-full' : 'translate-y-0',
      )}
    >
      {backTarget ? (
        <Link
          to={backTarget.to}
          className="-ml-3 flex items-center gap-0.5 rounded-full py-1.5 pr-2.5 pl-1.5 font-display text-lg font-semibold text-joyna-ink transition-colors hover:bg-joyna-border"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            aria-hidden="true"
            className="h-5 w-5"
            strokeWidth={2}
          />
          {backTarget.label}
        </Link>
      ) : (
        <span className="font-display text-lg font-semibold text-joyna-ink">
          {getScreenTitle(pathname)}
        </span>
      )}
      <nav aria-label="Account" className="flex items-center gap-2">
        <Link
          to="/notifications"
          aria-label={
            showUnreadBadge ? 'Notifications (unread)' : 'Notifications'
          }
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-control border transition-colors',
            pathname === '/notifications'
              ? 'border-joyna-ink bg-joyna-ink text-white'
              : 'border-joyna-border bg-white text-joyna-ink-soft hover:text-joyna-ink',
          )}
        >
          <HugeiconsIcon
            icon={Notification03Icon}
            className="h-5 w-5"
            strokeWidth={2}
          />
          {showUnreadBadge && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-joyna-coral ring-2 ring-joyna-cream"
            />
          )}
        </Link>
        <Link
          to="/profile"
          aria-label="Profile"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-control border transition-colors',
            profileActive
              ? 'border-joyna-ink bg-joyna-ink text-white'
              : 'border-joyna-border bg-white text-joyna-ink-soft hover:text-joyna-ink',
          )}
        >
          <HugeiconsIcon
            icon={UserCircleIcon}
            className="h-5 w-5"
            strokeWidth={2}
          />
        </Link>
      </nav>
    </header>
  )
}

function BottomMenu() {
  const {pathname} = useLocation()
  const eventsActive =
    pathname === '/' || pathname === '/events' || pathname === '/events/all'
  const networkActive = pathname === '/network'

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-10 flex items-center justify-between px-5 py-3"
    >
      <div className="flex h-11 items-center gap-1 rounded-full border border-joyna-border-strong bg-white px-1">
        <Link
          to="/events"
          className={cn(
            'flex h-9 items-center rounded-full px-4 text-xs font-semibold transition-colors',
            eventsActive ? 'bg-joyna-ink text-white' : 'text-joyna-ink-soft',
          )}
        >
          Events
        </Link>
        <Link
          to="/network"
          className={cn(
            'flex h-9 items-center rounded-full px-4 text-xs font-semibold transition-colors',
            networkActive ? 'bg-joyna-ink text-white' : 'text-joyna-ink-soft',
          )}
        >
          Network
        </Link>
      </div>
      {eventsActive && (
        <Link
          to="/events/new"
          aria-label="Create event"
          className="flex h-11 shrink-0 items-center justify-center rounded-full bg-joyna-coral px-5 font-display text-sm font-semibold text-white transition-transform active:scale-95"
        >
          + New
        </Link>
      )}
      {networkActive && (
        <Link
          to="/network/manage"
          className="flex h-11 shrink-0 items-center justify-center rounded-full bg-joyna-coral px-5 font-display text-sm font-semibold text-white transition-transform active:scale-95"
        >
          Manage
        </Link>
      )}
    </nav>
  )
}

function RootLayout() {
  const {user} = useAuth()
  const {pathname} = useLocation()

  if (!user) {
    return <Outlet />
  }

  const showBottomMenu = !isPushedPath(pathname)

  return (
    <div className="flex min-h-dvh flex-col bg-joyna-cream font-body text-joyna-ink">
      <TopMenu />
      <main className="flex-1">
        <Outlet />
      </main>
      {showBottomMenu && <BottomMenu />}
    </div>
  )
}

export default RootLayout
