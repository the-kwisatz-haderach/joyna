import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import Home from "./home"

function renderHome() {
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
        <Home />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("Home", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("welcomes the logged in user by name", async () => {
    renderHome()

    expect(
      await screen.findByRole("heading", { name: /welcome back, ada lovelace/i }),
    ).toBeInTheDocument()
  })

  it("shows the user's latest created events and their invitations", async () => {
    renderHome()

    expect(await screen.findByText("Summer Rooftop Party")).toBeInTheDocument()
    expect(screen.getByText("Board Game Night")).toBeInTheDocument()
    expect(screen.getByText("Turing Award Dinner")).toBeInTheDocument()
  })
})
