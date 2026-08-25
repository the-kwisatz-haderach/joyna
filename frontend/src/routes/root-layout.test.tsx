import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import RootLayout from "./root-layout"

function renderRootLayout() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <RootLayout />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("RootLayout", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("shows log in and sign up links for guests, no home link", () => {
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
      screen.queryByRole("link", { name: /^home$/i }),
    ).not.toBeInTheDocument()
  })

  it("shows a home link and a logout button for logged in users", () => {
    localStorage.setItem(
      "joyna.currentUser",
      JSON.stringify({
        id: mockUsers[0].id,
        name: mockUsers[0].name,
        email: mockUsers[0].email,
        joinedAt: mockUsers[0].joinedAt,
      }),
    )

    renderRootLayout()

    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute(
      "href",
      "/",
    )
    expect(
      screen.getByRole("button", { name: /log out/i }),
    ).toBeInTheDocument()
  })
})
