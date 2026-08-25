import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useParams } from "react-router"
import { describe, expect, it } from "vitest"

import CreateEvent from "./create-event"

function EventDetailStub() {
  const { id } = useParams()
  return <div>Event detail {id}</div>
}

function renderCreateEvent() {
  return render(
    <MemoryRouter initialEntries={["/events/new"]}>
      <Routes>
        <Route path="/events" element={<div>Events</div>} />
        <Route path="/events/new" element={<CreateEvent />} />
        <Route path="/events/:id" element={<EventDetailStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("CreateEvent", () => {
  it("renders the event fields and a link back to events", () => {
    renderCreateEvent()

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/rsvp deadline/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /create event/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /back to events/i })).toHaveAttribute(
      "href",
      "/events",
    )
  })

  it("creates the event and navigates to its detail page on success", async () => {
    const user = userEvent.setup()
    renderCreateEvent()

    await user.type(screen.getByLabelText(/name/i), "Launch Party")
    await user.type(screen.getByLabelText(/date/i), "2026-09-20T18:00")
    await user.type(screen.getByLabelText(/location/i), "Rooftop, Stockholm")
    await user.type(
      screen.getByLabelText(/description/i),
      "Celebrating the launch.",
    )
    await user.selectOptions(screen.getByLabelText(/^type/i), "party")
    await user.click(screen.getByRole("button", { name: /create event/i }))

    await waitFor(() => {
      expect(screen.getByText(/event detail/i)).toBeInTheDocument()
    })
  })
})
