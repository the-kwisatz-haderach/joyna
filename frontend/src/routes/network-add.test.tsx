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
})
