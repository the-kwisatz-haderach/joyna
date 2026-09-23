import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import type { EventTemplate } from '@/lib/event-template'
import CreateEvent from './create-event'
import EventDetail from './event-detail'

function EventDetailStub() {
  const { id } = useParams()
  return <div>Event detail {id}</div>
}

function renderCreateEvent() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/events/new']}>
        <Routes>
          <Route path="/events" element={<div>Events</div>} />
          <Route path="/events/new" element={<CreateEvent />} />
          <Route path="/events/:id" element={<EventDetailStub />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function loginAsMockUser() {
  localStorage.setItem(
    'joyna.currentUser',
    JSON.stringify({
      id: mockUsers[0].id,
      name: mockUsers[0].name,
      email: mockUsers[0].email,
      joinedAt: mockUsers[0].joinedAt,
    }),
  )
}

function renderCreateEventWithRealDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/events/new']}>
        <Routes>
          <Route path="/events" element={<div>Events</div>} />
          <Route path="/events/new" element={<CreateEvent />} />
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function renderCreateEventWithTemplate(template: EventTemplate) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{pathname: '/events/new/blank', state: {template}}]}>
        <Routes>
          <Route path="/events" element={<div>Events</div>} />
          <Route path="/events/new/blank" element={<CreateEvent />} />
          <Route path="/events/:id" element={<EventDetailStub />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
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
  afterEach(() => {
    localStorage.clear()
  })

  it('renders the event fields', () => {
    renderCreateEvent()

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/time/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search for a place/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('hides the RSVP deadline fields behind an "Add deadline" button by default', () => {
    renderCreateEvent()

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add deadline/i })).toBeInTheDocument()
  })

  it('offers 1-7 as RSVP deadline amount options once a deadline is added', async () => {
    const user = userEvent.setup()
    renderCreateEvent()

    await user.click(screen.getByRole('button', { name: /add deadline/i }))

    const [amountSelect] = screen.getAllByRole('combobox')
    const optionLabels = [...amountSelect.querySelectorAll('option')].map(
      (option) => option.textContent,
    )
    expect(optionLabels).toEqual(['1', '2', '3', '4', '5', '6', '7'])
  })

  it('removes the RSVP deadline fields when the "X" button is clicked', async () => {
    const user = userEvent.setup()
    renderCreateEvent()

    await user.click(screen.getByRole('button', { name: /add deadline/i }))
    expect(screen.getAllByRole('combobox')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /remove rsvp deadline/i }))

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add deadline/i })).toBeInTheDocument()
  })

  // These two simulate real keystrokes across several fields plus a calendar
  // click and an async navigation wait — comfortably under 5s in isolation,
  // but that many sequential userEvent interactions can tip past vitest's
  // default 5000ms test timeout under the CPU contention of a full parallel
  // suite run. Give them headroom rather than racing the default.
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
  }, 15000)

  it('submits the selected mood and shows it as a chip on the created event', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderCreateEventWithRealDetail()

    await user.type(screen.getByLabelText(/title/i), 'Launch Party')
    await user.click(pickAnEnabledDay())
    await user.click(screen.getByRole('button', { name: /chill/i }))
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/chill mood/i)).toBeInTheDocument()
  }, 15000)

  it('pre-fills the location from the profile address, but stays editable', () => {
    localStorage.setItem(
      'joyna.currentUser',
      JSON.stringify({
        id: mockUsers[0].id,
        name: mockUsers[0].name,
        email: mockUsers[0].email,
        joinedAt: mockUsers[0].joinedAt,
        address: '221B Baker Street',
      }),
    )

    renderCreateEvent()

    expect(screen.getByPlaceholderText(/search for a place/i)).toHaveValue(
      '221B Baker Street',
    )
  })

  it('pre-fills title, time, location, mood and description from a template', () => {
    renderCreateEventWithTemplate({
      id: 'template-1',
      name: 'Afterwork today',
      icon: '🍻',
      title: 'Afterwork drinks',
      dateOption: 'today',
      timeOfDay: '17:00',
      location: "Ye ol' pub",
      rsvpDeadlineOption: 'none',
      mood: 'chill',
      description: 'Casual after-work hangout.',
    })

    expect(screen.getByLabelText(/title/i)).toHaveValue('Afterwork drinks')
    expect(screen.getByLabelText(/time/i)).toHaveValue('17:00')
    expect(screen.getByPlaceholderText(/search for a place/i)).toHaveValue("Ye ol' pub")
    expect(screen.getByLabelText(/description/i)).toHaveValue('Casual after-work hangout.')
    expect(screen.getByRole('button', { name: /chill/i })).toHaveClass('border-joyna-periwinkle')
    expect(screen.getByText(/using the .afterwork today. template/i)).toBeInTheDocument()
  })

  it('pre-fills the RSVP deadline amount/unit from the template\'s rsvpDeadlineOption', () => {
    renderCreateEventWithTemplate({
      id: 'template-2',
      name: 'Birthday party',
      icon: '🥳',
      title: 'Birthday party',
      dateOption: 'none',
      location: '',
      rsvpDeadlineOption: '1_week_before',
      mood: 'party',
      description: '',
    })

    const [amountSelect, unitSelect] = screen.getAllByRole('combobox')
    expect(amountSelect).toHaveValue('1')
    expect(unitSelect).toHaveValue('week')
  })
})
