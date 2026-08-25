import { Link, useParams } from "react-router"

function EventDetail() {
  const { id } = useParams()

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
      <Link to="/events" className="text-sm text-primary hover:underline">
        ← Back to events
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">
        Event details
      </h1>
      <p className="text-muted-foreground">
        Details for event {id} are coming soon.
      </p>
    </section>
  )
}

export default EventDetail
