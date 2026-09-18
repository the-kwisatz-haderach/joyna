import { Link, Outlet, useLocation } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Notification03Icon, UserCircleIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { useAuth } from '../auth-context'

function isPushedPath(pathname: string): boolean {
  return (
    pathname === '/events/new' ||
    /^\/events\/[^/]+\/edit$/.test(pathname) ||
    /^\/events\/[^/]+$/.test(pathname)
  )
}

function getScreenTitle(pathname: string): string {
  if (pathname === '/notifications') return 'Notifications'
  if (pathname === '/profile') return 'Profile'
  return 'Events'
}

function TopMenu() {
  const { pathname } = useLocation()
  const pushed = isPushedPath(pathname)

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-joyna-border bg-joyna-cream px-5 py-4">
      {pushed ? (
        <Link
          to="/events"
          aria-label="Back to events"
          className="flex h-8 w-8 items-center justify-center rounded-full text-joyna-ink transition-colors hover:bg-joyna-border"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" strokeWidth={2} />
        </Link>
      ) : (
        <span className="font-display text-lg font-semibold text-joyna-ink">
          {getScreenTitle(pathname)}
        </span>
      )}
      <nav aria-label="Account" className="flex items-center gap-2">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-control border border-joyna-border bg-white shadow-sm transition-colors',
            pathname === '/notifications' ? 'text-joyna-coral' : 'text-joyna-ink-soft hover:text-joyna-ink'
          )}
        >
          <HugeiconsIcon icon={Notification03Icon} className="h-5 w-5" strokeWidth={2} />
        </Link>
        <Link
          to="/profile"
          aria-label="Profile"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-control border border-joyna-border bg-white shadow-sm transition-colors',
            pathname === '/profile' ? 'text-joyna-coral' : 'text-joyna-ink-soft hover:text-joyna-ink'
          )}
        >
          <HugeiconsIcon icon={UserCircleIcon} className="h-5 w-5" strokeWidth={2} />
        </Link>
      </nav>
    </header>
  )
}

function BottomMenu() {
  const { pathname } = useLocation()
  const eventsActive = pathname === '/' || pathname === '/events'
  const networkActive = pathname === '/network'

  return (
    <nav aria-label="Primary" className="sticky bottom-0 z-10 flex items-center justify-between px-5 py-3">
      <div className="flex h-11 items-center gap-1 rounded-full border border-joyna-border-strong px-1">
        <Link
          to="/events"
          className={cn(
            'flex h-9 items-center rounded-full px-4 text-xs font-semibold transition-colors',
            eventsActive ? 'bg-joyna-ink text-white' : 'text-joyna-ink-soft'
          )}
        >
          Events
        </Link>
        <Link
          to="/network"
          className={cn(
            'flex h-9 items-center rounded-full px-4 text-xs font-semibold transition-colors',
            networkActive ? 'bg-joyna-ink text-white' : 'text-joyna-ink-soft'
          )}
        >
          Network
        </Link>
      </div>
      {eventsActive && (
        <Link
          to="/events/new"
          aria-label="Create event"
          className="flex h-11 shrink-0 items-center justify-center rounded-full bg-joyna-coral px-5 font-display text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
        >
          + New
        </Link>
      )}
    </nav>
  )
}

function RootLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()

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
