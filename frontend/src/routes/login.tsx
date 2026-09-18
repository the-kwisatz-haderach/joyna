import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '../auth-context'
import type { SessionUser } from '../auth-context'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Incorrect email or password.'
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
            Email
            <Input type="email" name="email" required className="h-10 rounded-field" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
            Password
            <Input type="password" name="password" required className="h-10 rounded-field" />
          </label>
          {error && (
            <p role="alert" className="text-sm text-joyna-red-dark">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-2 h-11 w-full rounded-control font-display text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className="text-center text-sm text-joyna-ink-soft">
          Don&apos;t have an account?{' '}
          <Link to="/register" viewTransition className="font-medium text-joyna-coral hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Login
