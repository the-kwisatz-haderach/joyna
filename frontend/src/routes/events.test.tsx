import { render, screen, within } from "@testing-library/react"
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
  it("renders a dummy create event button", async () => {
    renderEvents()

    expect(
      await screen.findByRole("button", { name: /create event/i }),
    ).toBeInTheDocument()
  })

  it("splits events into upcoming and archive sections, each linking to a detail page", async () => {
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

    const archiveHeading = screen.getByRole("heading", { name: /archive/i })
    const archiveSection = archiveHeading.parentElement as HTMLElement
    const archivedLink = await within(archiveSection).findByRole("link", {
      name: /welcome mixer/i,
    })
    expect(archivedLink).toHaveAttribute(
      "href",
      "/events/c1a2b3c4-1111-4a1a-8a1a-000000000003",
    )

    expect(
      within(archiveSection).queryByText(/summer rooftop party/i),
    ).not.toBeInTheDocument()
  })
})
