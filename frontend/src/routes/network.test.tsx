import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import { server } from "../mocks/node"
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

  it("shows the current network grouped, with a favorite indicator and events-together counts", async () => {
    renderNetwork()

    const groupHeading = await screen.findByRole("heading", {
      name: /close friends/i,
    })
    expect(within(groupHeading).getByLabelText("favorite")).toBeInTheDocument()
    expect(screen.getByText("Alan Turing")).toBeInTheDocument()
    expect(screen.getByText("4 events together")).toBeInTheDocument()

    expect(
      await screen.findByRole("heading", { name: /acquaintances/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument()
    expect(screen.getByText("0 events together")).toBeInTheDocument()
  })

  it("links to the add-by-email screen", async () => {
    renderNetwork()

    const addLink = await screen.findByRole("link", { name: /add by email/i })
    expect(addLink).toHaveAttribute("href", "/network/add")
  })

  it("shows the potential network with shared event counts", async () => {
    renderNetwork()

    expect(
      await screen.findByRole("heading", { name: /people you may know/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Margaret Hamilton")).toBeInTheDocument()
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

    // She joins the existing "Acquaintances" group rather than spawning a
    // second one, and disappears from the potential-network suggestions —
    // leaving exactly one occurrence of her name on the page.
    expect(await screen.findAllByText("Margaret Hamilton")).toHaveLength(1)
    expect(screen.getAllByRole("heading", { name: /acquaintances/i })).toHaveLength(1)
  })

  it("filters contacts by name", async () => {
    const user = userEvent.setup()
    renderNetwork()

    await screen.findByText("Alan Turing")
    await user.type(screen.getByLabelText(/search your network/i), "Grace")

    expect(screen.getByText("Grace Hopper")).toBeInTheDocument()
    expect(screen.queryByText("Alan Turing")).not.toBeInTheDocument()
  })

  it("filters by group name, keeping every contact in a matching group", async () => {
    const user = userEvent.setup()
    renderNetwork()

    await screen.findByText("Alan Turing")
    await user.type(screen.getByLabelText(/search your network/i), "Close Friends")

    expect(screen.getByText("Alan Turing")).toBeInTheDocument()
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument()
  })

  it("shows an empty state with an add-by-email button when the network has no connections", async () => {
    server.use(
      http.get("/api/network", () => HttpResponse.json([])),
      http.get("/api/network/potential", () => HttpResponse.json([])),
    )
    renderNetwork()

    expect(
      await screen.findByRole("heading", { name: /your network is empty/i }),
    ).toBeInTheDocument()
    const addLink = screen.getByRole("link", { name: /add by email/i })
    expect(addLink).toHaveAttribute("href", "/network/add")
    expect(screen.queryByLabelText(/search your network/i)).not.toBeInTheDocument()
  })

  it("still shows suggestions below the empty state when there are potential connections", async () => {
    server.use(http.get("/api/network", () => HttpResponse.json([])))
    renderNetwork()

    expect(
      await screen.findByRole("heading", { name: /your network is empty/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /people you may know/i }),
    ).toBeInTheDocument()
  })
})
