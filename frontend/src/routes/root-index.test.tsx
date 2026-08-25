import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import RootIndex from "./root-index"

function renderRootIndex() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <RootIndex />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("RootIndex", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("renders the marketing landing page for guests", () => {
    renderRootIndex()

    expect(
      screen.getByRole("link", { name: /get started/i }),
    ).toBeInTheDocument()
  })

  it("renders the home dashboard for logged in users", async () => {
    localStorage.setItem(
      "joyna.currentUser",
      JSON.stringify({
        id: mockUsers[0].id,
        name: mockUsers[0].name,
        email: mockUsers[0].email,
        joinedAt: mockUsers[0].joinedAt,
      }),
    )

    renderRootIndex()

    expect(
      await screen.findByRole("heading", { name: /welcome back, ada lovelace/i }),
    ).toBeInTheDocument()
  })
})
