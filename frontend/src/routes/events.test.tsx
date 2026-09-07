import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"

import Events from "./events"

function renderEvents() {
  return render(
    <MemoryRouter initialEntries={["/events"]}>
      <Routes>
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<div>Event detail</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("Events", () => {
  it("shows upcoming events with a link to their detail page", async () => {
    renderEvents()

    const upcomingHeading = await screen.findByRole("heading", {
      name: /upcoming/i,
    })
    const upcomingSection = upcomingHeading.parentElement as HTMLElement
    const upcomingLink = await within(upcomingSection).findByRole("link", {
      name: /summer rooftop party/i,
    })
    expect(upcomingLink).toHaveAttribute(
      "href",
      "/events/c1a2b3c4-1111-4a1a-8a1a-000000000001",
    )
  })

  it("hides happened events behind a collapsed, expandable section", async () => {
    const user = userEvent.setup()
    renderEvents()

    const happenedToggle = await screen.findByRole("button", {
      name: /happened/i,
    })
    expect(happenedToggle).toHaveAttribute("aria-expanded", "false")
    expect(
      screen.queryByRole("link", { name: /welcome mixer/i }),
    ).not.toBeInTheDocument()

    await user.click(happenedToggle)

    expect(happenedToggle).toHaveAttribute("aria-expanded", "true")
    const happenedSection = happenedToggle.closest("div") as HTMLElement
    const happenedLink = await within(happenedSection).findByRole("link", {
      name: /welcome mixer/i,
    })
    expect(happenedLink).toHaveAttribute(
      "href",
      "/events/c1a2b3c4-1111-4a1a-8a1a-000000000003",
    )
    expect(
      within(happenedSection).queryByText(/summer rooftop party/i),
    ).not.toBeInTheDocument()
  })
})
