import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import Profile from "./profile"

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

function renderProfile() {
  return render(
    <AuthProvider>
      <Profile />
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
