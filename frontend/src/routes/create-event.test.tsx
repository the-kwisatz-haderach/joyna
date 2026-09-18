import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { describe, expect, it } from 'vitest'

import CreateEvent from './create-event'

function EventDetailStub() {
  const { id } = useParams()
  return <div>Event detail {id}</div>
}

function renderCreateEvent() {
  return render(
    <MemoryRouter initialEntries={['/events/new']}>
      <Routes>
        <Route path="/events" element={<div>Events</div>} />
        <Route path="/events/new" element={<CreateEvent />} />
        <Route path="/events/:id" element={<EventDetailStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

function pickAnEnabledDay() {
  const dayButtons = document.querySelectorAll<HTMLButtonElement>('button[data-day]')
  const enabled = [...dayButtons].find((btn) => !btn.disabled)
  if (!enabled) {
    throw new Error('no enabled calendar day found')
  }
  return enabled
}

describe('CreateEvent', () => {
  it('renders the event fields', () => {
    renderCreateEvent()

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/time/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search for a place/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('creates the event and navigates to its detail page on success', async () => {
    const user = userEvent.setup()
    renderCreateEvent()

    await user.type(screen.getByLabelText(/title/i), 'Launch Party')
    await user.click(pickAnEnabledDay())
    await user.type(
      screen.getByPlaceholderText(/search for a place/i),
      'Rooftop, Stockholm',
    )
    await user.type(
      screen.getByLabelText(/description/i),
      'Celebrating the launch.',
    )
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByText(/event detail/i)).toBeInTheDocument()
    })
  })
})
