import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LocationField } from './location-field'

// No VITE_GOOGLE_MAPS_API_KEY is set in the test environment, so
// LocationField always renders its plain-text fallback here — the same
// path used in production when the key isn't configured. The real
// autocomplete-select path needs a live Google API key and is verified
// manually (see the integration plan), not in this suite.
describe('LocationField (no API key configured)', () => {
  it('renders a plain text field and the static map placeholder', () => {
    render(
      <LocationField value="" onChange={vi.fn()} coordinates={null} onCoordinatesChange={vi.fn()} />,
    )

    expect(screen.getByPlaceholderText(/search for a place/i)).toBeInTheDocument()
    expect(screen.getByText(/map preview/i)).toBeInTheDocument()
  })

  it('reports free-typed text via onChange, with no coordinates required', () => {
    const handleChange = vi.fn()
    render(
      <LocationField
        value=""
        onChange={handleChange}
        coordinates={null}
        onCoordinatesChange={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/search for a place/i), {
      target: { value: "Ada's place" },
    })

    expect(handleChange).toHaveBeenCalledWith("Ada's place")
  })

  it('shows a readout of the current location once it has a value', () => {
    render(
      <LocationField
        value="Ada's place"
        onChange={vi.fn()}
        coordinates={null}
        onCoordinatesChange={vi.fn()}
      />,
    )

    expect(screen.getByText("Ada's place")).toBeInTheDocument()
  })

  it('shows no location readout (icon + text below the map) when empty', () => {
    render(
      <LocationField value="" onChange={vi.fn()} coordinates={null} onCoordinatesChange={vi.fn()} />,
    )

    // The readout is the only place in the fallback that renders an icon.
    expect(document.querySelector('svg')).toBeNull()
  })
})
