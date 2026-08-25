import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import Login from "./login"

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("Login", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("renders email and password fields, and a link to register", () => {
    renderLogin()

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/register",
    )
  })

  it("logs the user in and navigates to the home page on valid credentials", async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), "ada@joyna.dev")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })
    expect(localStorage.getItem("joyna.currentUser")).toContain("ada@joyna.dev")
  })

  it("shows an error message on invalid credentials", async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), "ada@joyna.dev")
    await user.type(screen.getByLabelText(/password/i), "wrong-password")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /incorrect email or password/i,
    )
    expect(localStorage.getItem("joyna.currentUser")).toBeNull()
  })
})
