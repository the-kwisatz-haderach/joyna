import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '../auth-context'
import type { SessionUser } from '../auth-context'

function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '')
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const address = String(form.get('address') ?? '').trim()

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, address: address || undefined }),
      })

      if (!response.ok) {
        setError(
          response.status === 409
            ? 'An account with this email already exists.'
            : 'Something went wrong. Please try again.',
        )
        return
      }

      const user = (await response.json()) as SessionUser
      login(user)
      navigate('/', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-dvh w-full items-center justify-center bg-joyna-cream px-6 py-16 font-body">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-card border border-joyna-border bg-white p-8 shadow-sm">
        <Link
          to="/"
          className="text-center font-display text-3xl font-bold text-joyna-coral"
        >
          joyna
        </Link>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
            Name
            <Input type="text" name="name" required className="h-10 rounded-field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
            Email
            <Input type="email" name="email" required className="h-10 rounded-field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
            Password
            <Input type="password" name="password" required className="h-10 rounded-field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
            Address <span className="font-normal text-joyna-ink-faint">(optional)</span>
            <Input type="text" name="address" className="h-10 rounded-field" />
            <span className="text-xs font-normal text-joyna-ink-faint">
              Used to pre-fill the location when you create events.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-joyna-red-dark">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-2 h-11 w-full rounded-control font-display text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Signing up…' : 'Create account'}
          </Button>
        </form>
        <p className="text-center text-sm text-joyna-ink-soft">
          Already have an account?{' '}
          <Link to="/login" viewTransition className="font-medium text-joyna-coral hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Register
