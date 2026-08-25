import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "../auth-context"
import type { SessionUser } from "../auth-context"

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "")
    const password = String(form.get("password") ?? "")

    setIsSubmitting(true)
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        setError(
          response.status === 401
            ? "Incorrect email or password."
            : "Something went wrong. Please try again.",
        )
        return
      }

      const user = (await response.json()) as SessionUser
      login(user)
      navigate("/", { replace: true })
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      style={{ viewTransitionName: "auth-background" }}
      className="ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] flex min-h-dvh w-screen items-center justify-center bg-gradient-to-br from-background via-accent/40 to-primary/10 px-6 py-16"
    >
      <div
        style={{ viewTransitionName: "auth-card" }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-background/80 p-8 shadow-sm backdrop-blur-sm"
      >
        <Link to="/" className="text-lg font-semibold text-foreground">
          joyna
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Log in</h1>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              name="password"
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            viewTransition
            className="text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Login
