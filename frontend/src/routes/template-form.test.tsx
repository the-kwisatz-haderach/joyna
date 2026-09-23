import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import TemplateForm from './template-form'

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

function renderTemplateForm(initialEntry: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/events/templates/new" element={<TemplateForm />} />
          <Route path="/events/templates/:id" element={<TemplateForm />} />
          <Route path="/events/templates" element={<div>Manage templates screen</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('TemplateForm', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('creates a new template and redirects to the manage screen', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderTemplateForm('/events/templates/new')

    await user.type(screen.getByLabelText(/icon/i), '🎉')
    await user.type(screen.getByLabelText(/template name/i), 'Trivia night')
    await user.type(screen.getByLabelText(/event title/i), 'Trivia night')

    await user.click(screen.getByRole('button', { name: /save template/i }))

    expect(await screen.findByText('Manage templates screen')).toBeInTheDocument()
  })

  it('loads an existing template for editing', async () => {
    loginAsMockUser()
    renderTemplateForm('/events/templates/f1a2b3c4-1111-4a1a-8a1a-000000000001')

    expect(await screen.findByDisplayValue('Afterwork today')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Afterwork drinks')).toBeInTheDocument()
    expect(screen.getByDisplayValue("Ye ol' pub")).toBeInTheDocument()
  })

  it('deletes a template after confirming', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderTemplateForm('/events/templates/f1a2b3c4-1111-4a1a-8a1a-000000000004')

    // This template's name and event title happen to coincide ("Movie
    // night" for both), so wait on the specific labeled field rather than
    // findByDisplayValue, which would otherwise match both inputs.
    const nameField = await screen.findByLabelText(/template name/i)
    expect(nameField).toHaveValue('Movie night')
    await user.click(screen.getByRole('button', { name: /^delete template$/i }))

    const dialog = within(await screen.findByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /delete template/i }))

    expect(await screen.findByText('Manage templates screen')).toBeInTheDocument()
  })
})
