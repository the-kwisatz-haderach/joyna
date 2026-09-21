import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import NetworkProfile from "./network-profile"

function loginAsMockUser() {
  localStorage.setItem(
    "joyna.currentUser",
    JSON.stringify({
      id: mockUsers[0].id,
      name: mockUsers[0].name,
      email: mockUsers[0].email,
      joinedAt: mockUsers[0].joinedAt,
    }),
  )
}

function renderNetworkProfile(contactId: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/network/${contactId}`]}>
        <Routes>
          <Route path="/network/:contactId" element={<NetworkProfile />} />
          <Route path="/network" element={<p>Back on the network list</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("NetworkProfile", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("shows the contact's name, email, group and events-together stat", async () => {
    loginAsMockUser()
    renderNetworkProfile(mockUsers[1].id)

    expect(await screen.findByText("Alan Turing")).toBeInTheDocument()
    expect(screen.getByText("alan@joyna.dev")).toBeInTheDocument()
    expect(screen.getByText("Close Friends")).toBeInTheDocument()
    expect(screen.getByText("4 events together")).toBeInTheDocument()
  })

  it("shows a fallback for a contact not in the caller's network", async () => {
    loginAsMockUser()
    renderNetworkProfile(mockUsers[2].id)

    expect(
      await screen.findByText(/isn.t in your network/i),
    ).toBeInTheDocument()
  })

  it("removes the contact from the network after confirming", async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderNetworkProfile(mockUsers[1].id)

    await screen.findByText("Alan Turing")
    await user.click(screen.getByRole("button", { name: /remove from network/i }))

    // Confirming re-renders the trigger and the dialog's own confirm button
    // with the same accessible name — the confirm button is the one added
    // last, inside the dialog's portal.
    const confirmButtons = await screen.findAllByRole("button", {
      name: /remove from network/i,
    })
    await user.click(confirmButtons[confirmButtons.length - 1])

    expect(await screen.findByText("Back on the network list")).toBeInTheDocument()
  })

  it("cancels the remove dialog without deleting the connection", async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderNetworkProfile(mockUsers[1].id)

    await screen.findByText("Alan Turing")
    await user.click(screen.getByRole("button", { name: /remove from network/i }))

    await user.click(await screen.findByRole("button", { name: /cancel/i }))

    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.getByText("Alan Turing")).toBeInTheDocument()
  })
})
