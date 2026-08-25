import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import RequireAuth from "./require-auth"

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>Login form</div>} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div>Dashboard</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("RequireAuth", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("redirects to /login when there is no active session", () => {
    renderAt("/dashboard")

    expect(screen.getByText("Login form")).toBeInTheDocument()
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()
  })

  it("renders the guarded route when a session is active", () => {
    localStorage.setItem(
      "joyna.currentUser",
      JSON.stringify({
        id: "1",
        name: "Ada Lovelace",
        email: "ada@joyna.dev",
        joinedAt: "2026-01-10T09:00:00Z",
      }),
    )

    renderAt("/dashboard")

    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.queryByText("Login form")).not.toBeInTheDocument()
  })
})
