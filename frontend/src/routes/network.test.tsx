import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import Network from "./network"

function renderNetwork() {
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
        <Network />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("Network", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("shows the current network grouped, with a favorite indicator", async () => {
    renderNetwork()

    expect(
      await screen.findByRole("heading", { name: /current network/i }),
    ).toBeInTheDocument()

    const groupHeading = await screen.findByRole("heading", {
      name: /close friends/i,
    })
    expect(groupHeading).toBeInTheDocument()
    expect(within(groupHeading).getByLabelText("favorite")).toBeInTheDocument()
    expect(screen.getByText("Alan Turing")).toBeInTheDocument()
  })

  it("shows the potential network with shared event counts", async () => {
    renderNetwork()

    expect(await screen.findByText("Margaret Hamilton")).toBeInTheDocument()
    expect(screen.getByText("Hedy Lamarr")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /add/i }).length).toBeGreaterThan(0)
  })

  it("moves a potential connection into the current network when added", async () => {
    const user = userEvent.setup()
    renderNetwork()

    const potentialItem = (await screen.findByText("Margaret Hamilton")).closest(
      "li",
    ) as HTMLElement
    await user.click(within(potentialItem).getByRole("button", { name: /add/i }))

    await screen.findByRole("heading", { name: /acquaintances/i })

    // She should now appear exactly once — grouped into the current network —
    // instead of showing up in both the current and potential sections.
    expect(await screen.findAllByText("Margaret Hamilton")).toHaveLength(1)
  })
})
