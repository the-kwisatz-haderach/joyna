import {useEffect, useState, type FormEvent} from 'react'
import {useNavigate} from 'react-router'

import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {useAuth} from '../auth-context'
import {GuestAvatar} from '../../components/joyna/guest-avatar'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

type LookupResult = {
  userId: string
  name: string
  email: string
}

type LookupStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error'

type NetworkGroupOption = {
  id: string
  name: string
}

async function fetchGroupOptions(): Promise<NetworkGroupOption[]> {
  const response = await fetch('/api/groups', {credentials: 'include'})
  if (!response.ok) {
    return []
  }
  const groups = (await response.json()) as {id: string; name: string}[]
  return groups
    .map(({id, name}) => ({id, name}))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function NetworkAdd() {
  const navigate = useNavigate()
  const {user} = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<LookupStatus>('idle')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [groupOptions, setGroupOptions] = useState<NetworkGroupOption[]>([])
  const [groupId, setGroupId] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)

  useEffect(() => {
    fetchGroupOptions().then(setGroupOptions)
  }, [])

  // Tracks the [email, self-email] pair that `status`/`result`/etc. currently
  // reflect, so a change to either can be detected — and the resulting state
  // reset applied synchronously during render, React's documented pattern
  // for "adjusting state when a value changes" — rather than as a
  // synchronous setState at the top of an effect, which forces an extra,
  // avoidable render before the effect's real async work (the debounced
  // lookup below) even starts.
  const selfEmail = user?.email ?? null
  const [processed, setProcessed] = useState({email, selfEmail})
  if (email !== processed.email || selfEmail !== processed.selfEmail) {
    setProcessed({email, selfEmail})
    setResult(null)
    setAddError(null)

    const trimmed = email.trim()
    if (!trimmed || !isValidEmail(trimmed)) {
      setStatus('idle')
    } else {
      // Only clear the "invite sent" confirmation once the user starts a new
      // lookup — not when this fires because a successful invite itself
      // cleared the email field (that takes the `idle` branch above instead).
      setInvitedEmail(null)

      // A user can't add themselves to their own network — treat their own
      // email as a no-op "no result" without even hitting the lookup API.
      if (selfEmail && trimmed.toLowerCase() === selfEmail.toLowerCase()) {
        setStatus('not-found')
      } else {
        setStatus('loading')
      }
    }
  }

  useEffect(() => {
    const trimmed = email.trim()
    if (!trimmed || !isValidEmail(trimmed)) return
    if (selfEmail && trimmed.toLowerCase() === selfEmail.toLowerCase()) return

    let cancelled = false
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/network/lookup?email=${encodeURIComponent(trimmed)}`,
          {credentials: 'include'},
        )
        if (cancelled) return
        if (response.status === 404) {
          setStatus('not-found')
          return
        }
        if (!response.ok) {
          setStatus('error')
          return
        }
        setResult((await response.json()) as LookupResult)
        setStatus('found')
      } catch {
        if (!cancelled) {
          setStatus('error')
        }
      }
    }, 1500)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [email, selfEmail])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (status === 'found') {
      if (!result) return
      setIsAdding(true)
      setAddError(null)
      try {
        const response = await fetch('/api/network', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          credentials: 'include',
          body: JSON.stringify({
            contactId: result.userId,
            groupId: groupId || undefined,
          }),
        })
        if (!response.ok) {
          throw new Error('failed to add connection')
        }
        navigate('/network')
      } catch {
        setAddError(
          "Couldn't add that person to your network. Please try again.",
        )
      } finally {
        setIsAdding(false)
      }
      return
    }

    if (status === 'not-found') {
      const trimmed = email.trim()
      if (!trimmed) return
      setIsAdding(true)
      setAddError(null)
      try {
        const response = await fetch('/api/network/invite', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          credentials: 'include',
          body: JSON.stringify({email: trimmed}),
        })
        if (response.status === 409) {
          setAddError(
            'Someone just registered with that email — search again to add them directly.',
          )
          return
        }
        if (!response.ok) {
          throw new Error('failed to send invite')
        }
        setInvitedEmail(trimmed)
        setEmail('')
      } catch {
        setAddError("Couldn't send that invite. Please try again.")
      } finally {
        setIsAdding(false)
      }
    }
  }

  const showCard = status === 'found' || status === 'not-found'

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6">
      <h1 className="font-display text-xl font-semibold text-joyna-ink">
        Add to your network
      </h1>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
        Email
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="oliver@twist.com"
          className="h-11 rounded-control bg-white"
          autoFocus
        />
      </label>

      {status === 'loading' && (
        <p className="text-sm text-joyna-ink-faint">Searching&hellip;</p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          Couldn&apos;t search for that email. Please try again.
        </p>
      )}

      {showCard && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-card border border-joyna-border bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <GuestAvatar
              name={status === 'found' ? result!.name : email.trim()}
              variant="stranger"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-joyna-ink">
                {status === 'found' ? result!.name : email.trim()}
              </p>
              {status === 'found' && (
                <p className="truncate text-xs text-joyna-ink-faint">
                  {result!.email}
                </p>
              )}
            </div>
          </div>

          {status === 'found' ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
              Add to group (optional)
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="h-11 rounded-control border border-joyna-border bg-white px-3 text-sm text-joyna-ink"
              >
                <option value="">Acquaintances</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-joyna-ink-faint">
              No account with that email? You can invite them to Joyna instead.
            </p>
          )}

          {addError && (
            <p role="alert" className="text-sm text-joyna-red-dark">
              {addError}
            </p>
          )}

          <Button
            type="submit"
            disabled={isAdding}
            className="h-11 rounded-control font-display text-sm"
          >
            {status === 'found'
              ? isAdding
                ? 'Adding…'
                : 'Add to network'
              : isAdding
                ? 'Sending…'
                : 'Invite to Joyna'}
          </Button>
        </form>
      )}

      {invitedEmail && (
        <p role="status" className="text-sm text-joyna-mint-dark">
          Invite sent to {invitedEmail}. They&apos;ll be added to your network
          once they register.
        </p>
      )}
    </section>
  )
}

export default NetworkAdd
