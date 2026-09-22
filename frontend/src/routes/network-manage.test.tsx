import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
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
        <Routes>
          <Route path="/network" element={<div>Network screen</div>} />
          <Route path="/network/manage" element={<NetworkManage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("NetworkManage", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("shows the title, ingress text, acquaintances and existing groups", async () => {
    renderNetworkManage()

    expect(
      await screen.findByRole("heading", { name: /manage network/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/drag a person onto a group/i)).toBeInTheDocument()

    // Grace Hopper has no groupId in the fixtures, so she's an acquaintance.
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument()

    const closeFriends = within(
      await screen.findByRole("group", { name: "Close Friends" }),
    )
    expect(closeFriends.getByText("Alan Turing")).toBeInTheDocument()
    expect(closeFriends.getByText("1 person")).toBeInTheDocument()

    expect(await screen.findByRole("group", { name: "Book Club" })).toBeInTheDocument()
  })

  it("links to the add-by-email screen", async () => {
    renderNetworkManage()

    const addLink = await screen.findByRole("link", { name: /add by email/i })
    expect(addLink).toHaveAttribute("href", "/network/add")
  })

  it("filters the acquaintances list by name", async () => {
    const user = userEvent.setup()
    renderNetworkManage()

    await screen.findByText("Grace Hopper")
    await user.type(screen.getByLabelText(/filter people/i), "nobody")

    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument()
    expect(screen.getByText(/no matches for/i)).toBeInTheDocument()
  })

  it("creates a new empty group", async () => {
    const user = userEvent.setup()
    renderNetworkManage()

    await screen.findByText("Grace Hopper")
    await user.type(screen.getByLabelText(/new group name/i), "Colleagues")
    await user.click(screen.getByRole("button", { name: /create group/i }))

    const group = await screen.findByRole("group", { name: "Colleagues" })
    expect(within(group).getByText("0 people")).toBeInTheDocument()
  })

  it("moves a person back to acquaintances when removed from a group", async () => {
    const user = userEvent.setup()
    renderNetworkManage()

    await screen.findByText("Alan Turing")
    await user.click(screen.getByRole("button", { name: /remove alan turing from group/i }))

    // He rejoins the acquaintances list and disappears from Close Friends.
    const closeFriends = await screen.findByRole("group", { name: "Close Friends" })
    expect(within(closeFriends).getByText("0 people")).toBeInTheDocument()
    expect(await screen.findAllByText("Alan Turing")).toHaveLength(1)
  })

  it("moves a dragged acquaintance into a group", async () => {
    renderNetworkManage()

    await screen.findByText("Alan Turing")
    const chip = screen.getByText("Grace Hopper").closest("div") as HTMLElement
    const bookClubCard = await screen.findByRole("group", { name: "Book Club" })

    fireEventDragAndDrop(chip, bookClubCard)

    expect(await within(bookClubCard).findByText("Grace Hopper")).toBeInTheDocument()
    expect(within(bookClubCard).getByText("1 person")).toBeInTheDocument()
  })

  it("applies drag-over styling to a group while a contact is dragged over it", async () => {
    renderNetworkManage()

    await screen.findByText("Alan Turing")
    const chip = screen.getByText("Grace Hopper").closest("div") as HTMLElement
    const bookClubCard = await screen.findByRole("group", { name: "Book Club" })

    fireEvent.dragStart(chip)
    fireEvent.dragEnter(bookClubCard)

    expect(bookClubCard.className).toMatch(/border-joyna-periwinkle/)

    fireEvent.drop(bookClubCard)

    expect(bookClubCard.className).not.toMatch(/border-joyna-periwinkle/)
  })

  it("deletes a group and moves its members back to acquaintances after confirming", async () => {
    const user = userEvent.setup()
    renderNetworkManage()

    const closeFriends = await screen.findByRole("group", { name: "Close Friends" })
    await user.click(within(closeFriends).getByRole("button", { name: /delete close friends/i }))

    expect(await screen.findByText(/delete .close friends.\?/i)).toBeInTheDocument()
    expect(
      screen.getByText(/alan turing will move to acquaintances\. this can.t be undone\./i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /delete group/i }))

    expect(screen.queryByRole("group", { name: "Close Friends" })).not.toBeInTheDocument()
    expect(await screen.findAllByText("Alan Turing")).toHaveLength(1)
  })

  it("cancels group deletion without removing the group", async () => {
    const user = userEvent.setup()
    renderNetworkManage()

    const bookClub = await screen.findByRole("group", { name: "Book Club" })
    await user.click(within(bookClub).getByRole("button", { name: /delete book club/i }))

    await screen.findByText(/delete .book club.\?/i)
    await user.click(screen.getByRole("button", { name: /cancel/i }))

    expect(screen.queryByText(/delete .book club.\?/i)).not.toBeInTheDocument()
    expect(await screen.findByRole("group", { name: "Book Club" })).toBeInTheDocument()
  })
})

// Native HTML5 drag/drop: jsdom dispatches "dragstart"/"drop" as plain
// events without a real drag session, so firing them directly (bypassing
// dataTransfer, which our handlers only use optionally) is enough to
// exercise the component's own state-driven move logic.
function fireEventDragAndDrop(source: HTMLElement, target: HTMLElement) {
  fireEvent.dragStart(source)
  fireEvent.drop(target)
}
