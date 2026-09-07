import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Notifications from "./notifications"

describe("Notifications", () => {
  it("renders a placeholder notifications screen", () => {
    render(<Notifications />)

    expect(
      screen.getByRole("heading", { name: /notifications/i }),
    ).toBeInTheDocument()
  })
})
