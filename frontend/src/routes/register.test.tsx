import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import Register from "./register"

function renderRegister() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe("Register", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("renders name, email and password fields, and a link back to login", () => {
    renderRegister()

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login",
    )
  })

  it("registers the user and navigates to the home page on success", async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/name/i), "Grace Hopper")
    await user.type(screen.getByLabelText(/email/i), "grace@joyna.dev")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })
    expect(localStorage.getItem("joyna.currentUser")).toContain(
      "grace@joyna.dev",
    )
  })

  it("shows an error message when the email is already registered", async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/name/i), "Ada Lovelace")
    await user.type(screen.getByLabelText(/email/i), "ada@joyna.dev")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /sign up/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /account with this email already exists/i,
    )
    expect(localStorage.getItem("joyna.currentUser")).toBeNull()
  })
})
