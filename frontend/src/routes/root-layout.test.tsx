import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import RootLayout from "./root-layout"

function renderRootLayout(initialEntries: string[] = ["/"]) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <RootLayout />
      </MemoryRouter>
    </AuthProvider>,
  )
}

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

describe("RootLayout", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("shows log in and sign up links for guests, no app navigation", () => {
    renderRootLayout()

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login",
    )
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/register",
    )
    expect(
      screen.queryByRole("link", { name: /^events$/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /^network$/i }),
    ).not.toBeInTheDocument()
  })

  it("shows the current screen name and app navigation for logged in users", () => {
    loginAsMockUser()

    renderRootLayout()

    const topMenu = within(screen.getByRole("banner"))
    expect(topMenu.getByText("Home")).toBeInTheDocument()
    expect(topMenu.getByRole("link", { name: /notifications/i })).toHaveAttribute(
      "href",
      "/notifications",
    )
    expect(topMenu.getByRole("link", { name: /profile/i })).toHaveAttribute(
      "href",
      "/profile",
    )

    const bottomMenu = within(
      screen.getByRole("navigation", { name: "Primary" }),
    )
    expect(bottomMenu.getByRole("link", { name: /^events$/i })).toHaveAttribute(
      "href",
      "/events",
    )
    expect(bottomMenu.getByRole("link", { name: /^network$/i })).toHaveAttribute(
      "href",
      "/network",
    )
  })

  it("updates the screen name based on the current route", () => {
    loginAsMockUser()

    renderRootLayout(["/network"])

    const topMenu = within(screen.getByRole("banner"))
    expect(topMenu.getByText("Network")).toBeInTheDocument()
  })
})
