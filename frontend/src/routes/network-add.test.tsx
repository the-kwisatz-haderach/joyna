import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import NetworkAdd from "./network-add"

function renderNetworkAdd() {
  localStorage.setItem(
    "joyna.currentUser",
    JSON.stringify({
      id: mockUsers[0].id,
      name: mockUsers[0].name,
      email: mockUsers[0].email,
      joinedAt: mockUsers[0].joinedAt,
    }),
  )

  return render(
    <AuthProvider>
      <MemoryRouter>
        <NetworkAdd />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("NetworkAdd", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("shows a matching user and offers to add them to a group", async () => {
    const user = userEvent.setup()
    renderNetworkAdd()

    await user.type(screen.getByLabelText(/email/i), mockUsers[2].email)

    // The lookup is debounced (~400ms) after the user stops typing.
    expect(await screen.findByText(mockUsers[2].name, {}, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getByText(mockUsers[2].email)).toBeInTheDocument()
    expect(screen.getByLabelText(/add to group/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add to network/i })).toBeInTheDocument()
  })

  it("does not search until a valid email address has been typed", async () => {
    const user = userEvent.setup()
    renderNetworkAdd()

    await user.type(screen.getByLabelText(/email/i), "not-an-email")

    // Give the debounce window a chance to fire; nothing should happen
    // because the typed value never became a valid email address.
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(screen.queryByText(/searching/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no account with that email/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /invite to joyna/i })).not.toBeInTheDocument()
  })

  it("offers to invite an unknown email to Joyna instead", async () => {
    const user = userEvent.setup()
    renderNetworkAdd()

    await user.type(screen.getByLabelText(/email/i), "nobody@example.com")

    expect(
      await screen.findByText(/no account with that email/i, {}, { timeout: 2000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /invite to joyna/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/add to group/i)).not.toBeInTheDocument()
  })

  it("sends an invite and shows a confirmation when submitted", async () => {
    const user = userEvent.setup()
    renderNetworkAdd()

    await user.type(screen.getByLabelText(/email/i), "nobody@example.com")
    await screen.findByRole("button", { name: /invite to joyna/i }, { timeout: 2000 })
    await user.click(screen.getByRole("button", { name: /invite to joyna/i }))

    expect(
      await screen.findByText(/invite sent to nobody@example\.com/i),
    ).toBeInTheDocument()
    // The form resets so another email can be invited without losing context.
    expect(screen.getByLabelText(/email/i)).toHaveValue("")
    expect(screen.queryByRole("button", { name: /invite to joyna/i })).not.toBeInTheDocument()
  })

  it("connects the inviter and the invitee once the invited email registers", async () => {
    const user = userEvent.setup()
    renderNetworkAdd()

    await user.type(screen.getByLabelText(/email/i), "invitee@example.com")
    await screen.findByRole("button", { name: /invite to joyna/i }, { timeout: 2000 })
    await user.click(screen.getByRole("button", { name: /invite to joyna/i }))
    await screen.findByText(/invite sent to invitee@example\.com/i)

    const registerResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Invitee",
        email: "invitee@example.com",
        password: "password123",
      }),
    })
    expect(registerResponse.ok).toBe(true)

    const connectionsResponse = await fetch("/api/network", { credentials: "include" })
    const connections = (await connectionsResponse.json()) as { contactEmail: string }[]
    expect(connections.some((c) => c.contactEmail === "invitee@example.com")).toBe(true)
  })

  it("treats searching your own email address as no result", async () => {
    const user = userEvent.setup()
    renderNetworkAdd()

    await user.type(screen.getByLabelText(/email/i), mockUsers[0].email)

    expect(
      await screen.findByText(/no account with that email/i, {}, { timeout: 2000 }),
    ).toBeInTheDocument()
    expect(screen.queryByText(mockUsers[0].name)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/add to group/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /invite to joyna/i })).toBeInTheDocument()
  })
})
