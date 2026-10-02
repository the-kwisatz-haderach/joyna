import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '../auth-context'
import type { SessionUser } from '../auth-context'

function EditProfile() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [location, setLocation] = useState(user?.address ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!user) return null

  async function handleDelete() {
    setDeleteError(null)
    setIsDeleting(true)
    try {
      const response = await fetch('/api/me', { method: 'DELETE', credentials: 'include' })
      if (!response.ok) {
        const message = await response.text()
        setDeleteError(message || 'Something went wrong. Please try again.')
        return
      }
      setConfirmingDelete(false)
      logout()
      navigate('/', { replace: true })
    } catch {
      setDeleteError('Something went wrong. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

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
            className="h-10 rounded-field bg-white"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Location <span className="font-normal text-joyna-ink-faint">(optional)</span>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-10 rounded-field bg-white"
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

      <div className="flex flex-col gap-2 border-t border-joyna-ink-faint/20 pt-6">
        <h2 className="font-display text-sm font-semibold text-joyna-ink">Delete account</h2>
        <p className="text-xs text-joyna-ink-faint">
          Your name will show as &ldquo;Inactive user&rdquo; on events you took part in, and your network
          connections and upcoming events are removed.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="h-11 rounded-control font-display text-sm"
          onClick={() => {
            setDeleteError(null)
            setConfirmingDelete(true)
          }}
        >
          Delete account
        </Button>
      </div>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="max-w-[280px] rounded-2xl text-center font-body">
          <DialogHeader className="items-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-joyna-red/10">
              <HugeiconsIcon icon={Delete02Icon} className="h-5 w-5 text-joyna-red" strokeWidth={2} />
            </div>
            <DialogTitle className="font-display text-[15px]">Delete your account?</DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              This can&rsquo;t be undone. Your data is removed and you&rsquo;ll be signed out.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-joyna-red-dark">
              {deleteError}
            </p>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="h-11 w-full rounded-control font-display text-sm"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting…' : 'Yes, delete my account'}
            </Button>
            <Button
              variant="secondary"
              className="h-11 w-full rounded-control font-display text-sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default EditProfile
