import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"

import EventDetail from "./event-detail"

function renderEventDetail(eventId: string) {
  return render(
    <MemoryRouter initialEntries={[`/events/${eventId}`]}>
      <Routes>
        <Route path="/events/:id" element={<EventDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("EventDetail", () => {
  it("shows event details, an Edit button, and attendees for the owner", async () => {
    renderEventDetail("c1a2b3c4-1111-4a1a-8a1a-000000000001")

    expect(
      await screen.findByRole("heading", { name: /summer rooftop party/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/downtown rooftop, stockholm/i)).toBeInTheDocument()
    expect(
      screen.getByText(/drinks and music under the stars/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()

    const attendeesHeading = screen.getByRole("heading", {
      name: /attendees/i,
    })
    const attendeesSection = attendeesHeading.parentElement as HTMLElement
    expect(within(attendeesSection).getByText("Ada Lovelace")).toBeInTheDocument()
    expect(within(attendeesSection).getByText("Host")).toBeInTheDocument()
    expect(
      within(attendeesSection).getByText("Margaret Hamilton"),
    ).toBeInTheDocument()
  })

  it("lets an invited user accept the invite", async () => {
    const user = userEvent.setup()
    renderEventDetail("c1a2b3c4-1111-4a1a-8a1a-000000000004")

    expect(
      await screen.findByRole("heading", { name: /turing award dinner/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument()

    const acceptButton = screen.getByRole("button", { name: /accept/i })
    await user.click(acceptButton)

    expect(
      await screen.findByText(/you're going to this event/i),
    ).toBeInTheDocument()
  })

  it("shows a not-found message for an event the viewer can't access", async () => {
    renderEventDetail("00000000-0000-0000-0000-000000000000")

    expect(await screen.findByText(/event not found/i)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /back to events/i }),
    ).toHaveAttribute("href", "/events")
  })
})
