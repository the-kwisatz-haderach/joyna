import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import Profile from "./profile"

function loginAsMockUser(overrides: Partial<{ address: string }> = {}) {
  localStorage.setItem(
    "joyna.currentUser",
    JSON.stringify({
      id: mockUsers[0].id,
      name: mockUsers[0].name,
      email: mockUsers[0].email,
      joinedAt: mockUsers[0].joinedAt,
      ...overrides,
    }),
  )
}

function renderProfile() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<div>Edit profile page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("Profile", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("shows the logged in user's name", () => {
    loginAsMockUser()

    renderProfile()

    expect(screen.getByText(mockUsers[0].name)).toBeInTheDocument()
  })

  it("shows the user's location when set", () => {
    loginAsMockUser({ address: "Stockholm, Sweden" })

    renderProfile()

    expect(screen.getByText("Stockholm, Sweden")).toBeInTheDocument()
  })

  it("does not show a location when unset", () => {
    loginAsMockUser()

    renderProfile()

    expect(screen.queryByTestId("profile-location")).not.toBeInTheDocument()
  })

  it("navigates to the edit profile page when 'Edit profile' is clicked", async () => {
    loginAsMockUser()
    const user = userEvent.setup()

    renderProfile()

    await user.click(screen.getByRole("button", { name: /edit profile/i }))

    expect(screen.getByText("Edit profile page")).toBeInTheDocument()
  })

  it("logs the user out when the log out button is clicked", async () => {
    loginAsMockUser()
    const user = userEvent.setup()

    renderProfile()

    await user.click(screen.getByRole("button", { name: /log out/i }))

    await waitFor(() => {
      expect(localStorage.getItem("joyna.currentUser")).toBeNull()
    })
  })
})
