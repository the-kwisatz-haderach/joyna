import { Button } from "@/components/ui/button"

function Register() {
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Sign up</h1>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => e.preventDefault()}
      >
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
        <Button type="submit" className="mt-2">
          Sign up
        </Button>
      </form>
    </section>
  )
}

export default Register
