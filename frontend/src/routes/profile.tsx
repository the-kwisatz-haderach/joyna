import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router'
import {HugeiconsIcon} from '@hugeicons/react'
import {Camera01Icon, ArrowRight01Icon} from '@hugeicons/core-free-icons'

import {useAuth} from '../auth-context'

type StatKey = 'hosted' | 'attended' | 'network'

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

async function fetchCount(url: string): Promise<number> {
  const response = await fetch(url, {credentials: 'include'})
  if (!response.ok) return 0
  const data = (await response.json()) as unknown[]
  return data.length
}

function Profile() {
  const {user, logout} = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Record<StatKey, number>>({
    hosted: 0,
    attended: 0,
    network: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      const [hostedEvents, invitedEvents, network] = await Promise.all([
        fetchCount('/api/events?scope=owned'),
        fetch('/api/events?scope=invited', {credentials: 'include'}).then(
          (r) => (r.ok ? (r.json() as Promise<{date: string}[]>) : []),
        ),
        fetchCount('/api/network'),
      ])
      if (cancelled) return
      const now = Date.now()
      // "Attended" is approximated as past events the user was invited to —
      // the events list endpoint doesn't expose per-invite status, so this
      // can't be narrowed to accepted-only invites (see the integration plan).
      const attended = invitedEvents.filter(
        (e) => new Date(e.date).getTime() < now,
      ).length
      setStats({hosted: hostedEvents, attended, network})
    }

    loadStats()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', {method: 'POST', credentials: 'include'})
    logout()
  }

  if (!user) return null

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-6 font-body">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-joyna-periwinkle font-display text-xl font-semibold text-white">
            {initials(user.name)}
          </div>
          <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-joyna-cream bg-joyna-coral text-white">
            <HugeiconsIcon
              icon={Camera01Icon}
              className="h-3 w-3"
              strokeWidth={2.5}
            />
          </div>
        </div>
        <div className="text-center">
          <p className="font-display text-lg font-semibold text-joyna-ink">
            {user.name}
          </p>
          <p className="text-sm text-joyna-ink-soft">{user.email}</p>
          {user.address && (
            <p
              data-testid="profile-location"
              className="text-xs mt-0.5 text-joyna-ink-faint"
            >
              {user.address}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['hosted', 'Hosted'],
            ['attended', 'Attended'],
            ['network', 'Network'],
          ] as const
        ).map(([key, label]) => (
          <div
            key={key}
            className="flex flex-col items-center gap-0.5 rounded-card border border-joyna-border bg-white py-3"
          >
            <span className="font-display text-lg font-semibold text-joyna-ink">
              {stats[key]}
            </span>
            <span className="text-[11px] text-joyna-ink-faint">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col divide-y divide-joyna-border rounded-card border border-joyna-border bg-white">
        <button
          type="button"
          className="flex items-center justify-between px-4 py-3 text-left text-sm text-joyna-ink"
          onClick={() => navigate('/profile/edit')}
        >
          Edit profile
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="h-4 w-4"
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          className="flex items-center justify-between px-4 py-3 text-left text-sm text-joyna-ink"
          onClick={() => navigate('/profile/notifications')}
        >
          Notification settings
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="h-4 w-4"
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-3 text-left text-sm font-medium text-joyna-red"
        >
          Log out
        </button>
      </div>
    </section>
  )
}

export default Profile
