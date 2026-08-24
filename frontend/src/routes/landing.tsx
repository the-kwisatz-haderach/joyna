import { Link } from "react-router"

function Landing() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold text-foreground">
        Create, share, and remember your events
      </h1>
      <p className="text-muted-foreground">
        Invite your network, forward events onward, and keep track of who you've
        met along the way.
      </p>
      <Link
        to="/register"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Get started
      </Link>
    </section>
  )
}

export default Landing
