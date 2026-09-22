import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AuthProvider } from "../auth-context"
import { mockUsers } from "../mocks/data"
import NotificationsSettings from "./notifications-settings"

function renderPage() {
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
        <NotificationsSettings />
      </MemoryRouter>
    </AuthProvider>,
  )
}

function fakeSubscription(endpoint = "https://push.example.com/sub-1") {
  return {
    endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({ endpoint, keys: { p256dh: "p256dh-key", auth: "auth-key" } }),
  }
}

describe("NotificationsSettings", () => {
  let getSubscription: ReturnType<typeof vi.fn>
  let subscribe: ReturnType<typeof vi.fn>
  let requestPermission: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getSubscription = vi.fn().mockResolvedValue(null)
    subscribe = vi.fn().mockResolvedValue(fakeSubscription())
    requestPermission = vi.fn().mockResolvedValue("granted")

    vi.stubGlobal("PushManager", class {})
    vi.stubGlobal("Notification", { requestPermission })
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: { getSubscription, subscribe },
        }),
      },
    })
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    // @ts-expect-error - cleaning up the per-test navigator.serviceWorker stub
    delete navigator.serviceWorker
  })

  it("shows the toggle unchecked when there is no existing subscription", async () => {
    renderPage()

    const toggle = await screen.findByRole("switch")
    expect(toggle).toHaveAttribute("aria-checked", "false")
  })

  it("shows the toggle checked when a subscription already exists", async () => {
    getSubscription.mockResolvedValue(fakeSubscription())
    renderPage()

    const toggle = await screen.findByRole("switch")
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"))
  })

  it("shows an unsupported message when the browser lacks Push API support", async () => {
    vi.unstubAllGlobals()
    renderPage()

    expect(await screen.findByText(/aren't supported in this browser/i)).toBeInTheDocument()
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })

  it("subscribes and posts the subscription when enabled", async () => {
    const user = userEvent.setup()
    renderPage()

    const toggle = await screen.findByRole("switch")
    expect(toggle).toHaveAttribute("aria-checked", "false")

    await user.click(toggle)

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"))
    expect(requestPermission).toHaveBeenCalled()
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    )
  })

  it("shows an error when notification permission is denied", async () => {
    requestPermission.mockResolvedValue("denied")
    const user = userEvent.setup()
    renderPage()

    const toggle = await screen.findByRole("switch")
    await user.click(toggle)

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission was not granted/i)
    expect(toggle).toHaveAttribute("aria-checked", "false")
  })

  it("unsubscribes and deletes the subscription when disabled", async () => {
    const subscription = fakeSubscription()
    getSubscription.mockResolvedValue(subscription)
    const user = userEvent.setup()
    renderPage()

    const toggle = await screen.findByRole("switch")
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"))

    await user.click(toggle)

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"))
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })
})
