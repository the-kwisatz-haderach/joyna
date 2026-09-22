import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '../auth-context'
import type { SessionUser } from '../auth-context'

function EditProfile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [location, setLocation] = useState(user?.address ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!user) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, address: location }),
      })
      if (!response.ok) {
        const message = await response.text()
        setError(message || 'Something went wrong. Please try again.')
        return
      }
      const updated = (await response.json()) as SessionUser
      updateUser(updated)
      navigate('/profile', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-6 font-body">
      <h1 className="font-display text-xl font-semibold text-joyna-ink">Edit profile</h1>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Name
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10 rounded-field"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Location <span className="font-normal text-joyna-ink-faint">(optional)</span>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-10 rounded-field"
          />
          <span className="text-xs font-normal text-joyna-ink-faint">
            Used to pre-fill the location when you create events.
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-joyna-red-dark">
            {error}
          </p>
        )}

        <div className="mt-2 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="h-11 flex-1 rounded-control font-display text-sm"
            onClick={() => navigate('/profile')}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-11 flex-1 rounded-control font-display text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default EditProfile
