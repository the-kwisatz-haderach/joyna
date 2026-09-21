import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import NetworkManage from "./network-manage"

function renderNetworkManage() {
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
      <MemoryRouter initialEntries={["/network/manage"]}>
        <NetworkManage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

// jsdom doesn't implement DataTransfer, so drag-and-drop tests supply a
// minimal stand-in that just round-trips whatever setData/getData store.
function createDataTransfer() {
  const store = new Map<string, string>()
  return {
    setData: (format: string, data: string) => store.set(format, data),
    getData: (format: string) => store.get(format) ?? "",
    dropEffect: "none",
    effectAllowed: "uninitialized",
  }
}

describe("NetworkManage", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("renders the title, ingress text, acquaintances, and existing groups", async () => {
    renderNetworkManage()

    expect(screen.getByText("Manage network")).toBeInTheDocument()
    expect(
      screen.getByText(/drag a person onto a group below to move them/i),
    ).toBeInTheDocument()

    // Alan Turing already belongs to "Close Friends" — wait for the fetched
    // data (rather than the static title above) before asserting on it.
    const closeFriends = within(await screen.findByRole("group", { name: "Close Friends" }))
    expect(closeFriends.getByText("Alan Turing")).toBeInTheDocument()
    expect(closeFriends.getByText("1 person")).toBeInTheDocument()

    // Grace Hopper has no group in the fixtures, so she's in Acquaintances.
    const acquaintances = within(screen.getByRole("group", { name: "Acquaintances" }))
    expect(acquaintances.getByText("Grace Hopper")).toBeInTheDocument()

    // "Book Club" has no members yet but still shows up — this is exactly the
    // gap GET /groups closes over deriving groups from /network connections.
    const bookClub = within(screen.getByRole("group", { name: "Book Club" }))
    expect(bookClub.getByText("0 people")).toBeInTheDocument()
    expect(bookClub.getByText(/drag someone here/i)).toBeInTheDocument()
  })

  it("filters the acquaintances list", async () => {
    const user = userEvent.setup()
    renderNetworkManage()

    await screen.findByText("Grace Hopper")

    await user.type(screen.getByLabelText(/filter people/i), "nobody")

    const acquaintances = within(screen.getByRole("group", { name: "Acquaintances" }))
    expect(acquaintances.queryByText("Grace Hopper")).not.toBeInTheDocument()
    expect(acquaintances.getByText(/no matches for/i)).toBeInTheDocument()
  })

  it("creates a new group", async () => {
    const user = userEvent.setup()
    renderNetworkManage()

    await screen.findByText("Book Club")

    await user.type(screen.getByLabelText(/new group name/i), "Neighbors")
    await user.click(screen.getByRole("button", { name: /create group/i }))

    const neighbors = within(await screen.findByRole("group", { name: "Neighbors" }))
    expect(neighbors.getByText("0 people")).toBeInTheDocument()
  })

  it("removes a member back into acquaintances", async () => {
    const user = userEvent.setup()
    renderNetworkManage()

    const closeFriends = within(await screen.findByRole("group", { name: "Close Friends" }))
    await user.click(closeFriends.getByRole("button", { name: /remove alan turing/i }))

    expect(await closeFriends.findByText(/drag someone here/i)).toBeInTheDocument()
    const acquaintances = within(screen.getByRole("group", { name: "Acquaintances" }))
    expect(await acquaintances.findByText("Alan Turing")).toBeInTheDocument()
  })

  it("moves a person into a group by dragging their chip", async () => {
    renderNetworkManage()

    const acquaintances = within(await screen.findByRole("group", { name: "Acquaintances" }))
    const chip = acquaintances.getByText("Grace Hopper").closest('[draggable="true"]')
    expect(chip).not.toBeNull()

    const bookClub = screen.getByRole("group", { name: "Book Club" })
    const dataTransfer = createDataTransfer()

    fireEventDragStart(chip!, dataTransfer)
    fireEventDrop(bookClub, dataTransfer)

    expect(await within(bookClub).findByText("Grace Hopper")).toBeInTheDocument()
    expect(within(bookClub).getByText("1 person")).toBeInTheDocument()
  })

  it("has Cancel and Done links back to the network screen", async () => {
    renderNetworkManage()

    await screen.findByText("Manage network")

    expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute("href", "/network")
    expect(screen.getByRole("link", { name: /^done$/i })).toHaveAttribute("href", "/network")
  })
})

// react-testing-library's fireEvent doesn't accept a plain object for
// dataTransfer typed correctly, so these small wrappers keep the `any` cast
// contained to one place instead of sprinkled through the test bodies.
function fireEventDragStart(element: Element, dataTransfer: unknown) {
  const event = new Event("dragstart", { bubbles: true, cancelable: true })
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer })
  element.dispatchEvent(event)
}

function fireEventDrop(element: Element, dataTransfer: unknown) {
  const event = new Event("drop", { bubbles: true, cancelable: true })
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer })
  element.dispatchEvent(event)
}
