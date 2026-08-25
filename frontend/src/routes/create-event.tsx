import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"

const EVENT_TYPES = [
  "birthday",
  "party",
  "dinner",
  "gathering",
  "concert",
  "other",
]

type CreatedEvent = {
  id: string
}

function CreateEvent() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") ?? "")
    const date = String(form.get("date") ?? "")
    const location = String(form.get("location") ?? "")
    const description = String(form.get("description") ?? "")
    const type = String(form.get("type") ?? "")
    const rsvpDeadline = String(form.get("rsvpDeadline") ?? "")

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          date: new Date(date).toISOString(),
          location,
          description,
          type,
          rsvpDeadline: rsvpDeadline
            ? new Date(rsvpDeadline).toISOString()
            : undefined,
          defaultSpreadAllowed: 0,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        setError(message || "Something went wrong. Please try again.")
        return
      }

      const created = (await response.json()) as CreatedEvent
      navigate(`/events/${created.id}`, { replace: true })
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-1">
        <Link to="/events" className="text-sm text-primary hover:underline">
          ← Back to events
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Create event
        </h1>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            name="name"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="datetime-local"
            name="date"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Location
          <input
            type="text"
            name="location"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            required
            rows={4}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            name="type"
            required
            defaultValue=""
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="" disabled>
              Select a type
            </option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          RSVP deadline (optional)
          <input
            type="datetime-local"
            name="rsvpDeadline"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-2" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create event"}
        </Button>
      </form>
    </section>
  )
}

export default CreateEvent
