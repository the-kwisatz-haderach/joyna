import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { AuthProvider } from "../auth-context"
import Register from "./register"

function renderRegister(initialEntry = "/register") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

// mockUsers (src/mocks/data.ts) already has several registered fixture
// users and keeps growing — generate a guaranteed-unique email per test
// instead of hardcoding one more name that might collide with a future
// fixture addition (this has happened twice already).
function uniqueEmail(): string {
  return `new-${crypto.randomUUID()}@joyna.dev`
}

describe("Register", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("renders name, email, password and address fields, and a link back to login", () => {
    renderRegister()

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    const addressField = screen.getByLabelText(/address/i)
    expect(addressField).toBeInTheDocument()
    expect(addressField).not.toBeRequired()
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login",
    )
  })

  it("prefills the email field from an ?email= query param", () => {
    renderRegister("/register?email=invited%40example.com")

    expect(screen.getByLabelText(/email/i)).toHaveValue("invited@example.com")
  })

  it("registers the user without an address when left blank", async () => {
    const user = userEvent.setup()
    const email = uniqueEmail()
    renderRegister()

    await user.type(screen.getByLabelText(/name/i), "Grace Hopper")
    await user.type(screen.getByLabelText(/email/i), email)
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })
    expect(localStorage.getItem("joyna.currentUser")).not.toContain("address")
  })

  it("registers the user with an optional address", async () => {
    const user = userEvent.setup()
    const email = uniqueEmail()
    renderRegister()

    await user.type(screen.getByLabelText(/name/i), "Margaret Hamilton")
    await user.type(screen.getByLabelText(/email/i), email)
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.type(screen.getByLabelText(/address/i), "123 Apollo Way")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })
    expect(localStorage.getItem("joyna.currentUser")).toContain(
      "123 Apollo Way",
    )
  })

  it("registers the user and navigates to the home page on success", async () => {
    const user = userEvent.setup()
    const email = uniqueEmail()
    renderRegister()

    await user.type(screen.getByLabelText(/name/i), "Katherine Johnson")
    await user.type(screen.getByLabelText(/email/i), email)
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })
    expect(localStorage.getItem("joyna.currentUser")).toContain(email)
  })

  it("shows an error message when the email is already registered", async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/name/i), "Ada Lovelace")
    await user.type(screen.getByLabelText(/email/i), "ada@joyna.dev")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /account with this email already exists/i,
    )
    expect(localStorage.getItem("joyna.currentUser")).toBeNull()
  })
})
