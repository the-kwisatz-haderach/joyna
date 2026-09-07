import { Link, Outlet, useLocation } from 'react-router'

import { useAuth } from '../auth-context'

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.2c2.4.4 4.2 2 5 5.8" />
    </svg>
  )
}

function getScreenName(pathname: string): string {
  if (pathname === '/') return 'Home'
  if (pathname === '/events') return 'Events'
  if (pathname === '/events/new') return 'New event'
  if (pathname.startsWith('/events/')) return 'Event'
  if (pathname === '/network') return 'Network'
  if (pathname === '/notifications') return 'Notifications'
  if (pathname === '/profile') return 'Profile'
  return 'joyna'
}

function TopMenu() {
  const { pathname } = useLocation()
  const screenName = getScreenName(pathname)

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
      <span className="font-semibold text-foreground">{screenName}</span>
      <nav aria-label="Account" className="flex items-center gap-3">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="text-foreground hover:text-primary"
        >
          <BellIcon />
        </Link>
        <Link
          to="/profile"
          aria-label="Profile"
          className="text-foreground hover:text-primary"
        >
          <UserIcon />
        </Link>
      </nav>
    </header>
  )
}

function BottomMenu() {
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-10 flex items-center gap-6 border-t border-border bg-background px-6 py-3"
    >
      <Link
        to="/events"
        className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary"
      >
        <CalendarIcon />
        Events
      </Link>
      <Link
        to="/network"
        className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary"
      >
        <UsersIcon />
        Network
      </Link>
    </nav>
  )
}

function GuestHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link to="/" className="font-semibold text-foreground">
        joyna
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link to="/login" className="text-foreground hover:text-primary">
          Log in
        </Link>
        <Link to="/register" className="text-foreground hover:text-primary">
          Sign up
        </Link>
      </nav>
    </header>
  )
}

function RootLayout() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col">
        <GuestHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopMenu />
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomMenu />
    </div>
  )
}

export default RootLayout
