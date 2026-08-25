import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"

import EventDetail from "./event-detail"

describe("EventDetail", () => {
  it("renders the event id and a link back to the events list", () => {
    render(
      <MemoryRouter initialEntries={["/events/abc-123"]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/abc-123/)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /back to events/i }),
    ).toHaveAttribute("href", "/events")
  })
})
