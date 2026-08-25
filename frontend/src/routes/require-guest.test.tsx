import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import RequireGuest from "./require-guest"

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route
            path="/login"
            element={
              <RequireGuest>
                <div>Login form</div>
              </RequireGuest>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("RequireGuest", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("renders the guarded route when there is no active session", () => {
    renderAt("/login")

    expect(screen.getByText("Login form")).toBeInTheDocument()
  })

  it("redirects to the home page when a session is already active", () => {
    localStorage.setItem(
      "joyna.currentUser",
      JSON.stringify({
        id: "1",
        name: "Ada Lovelace",
        email: "ada@joyna.dev",
        joinedAt: "2026-01-10T09:00:00Z",
      }),
    )

    renderAt("/login")

    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.queryByText("Login form")).not.toBeInTheDocument()
  })
})
