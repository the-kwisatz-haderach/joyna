import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import ManageTemplates from './manage-templates'

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

function EditStub() {
  const { id } = useParams()
  return <div>Edit template {id}</div>
}

function renderManageTemplates() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/events/templates']}>
        <Routes>
          <Route path="/events/templates" element={<ManageTemplates />} />
          <Route path="/events/templates/new" element={<div>New template form</div>} />
          <Route path="/events/templates/:id" element={<EditStub />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('ManageTemplates', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('lists the user\'s templates and a "New template" option', async () => {
    loginAsMockUser()
    renderManageTemplates()

    expect(await screen.findByRole('button', { name: /new template/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /afterwork today/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /weekend board games/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /birthday party/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /movie night/i })).toBeInTheDocument()
  })

  it('navigates to the new-template form', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderManageTemplates()

    await user.click(await screen.findByRole('button', { name: /new template/i }))

    expect(await screen.findByText('New template form')).toBeInTheDocument()
  })

  it('navigates to a template\'s edit form when clicked', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderManageTemplates()

    await user.click(await screen.findByRole('button', { name: /afterwork today/i }))

    expect(await screen.findByText(/edit template f1a2b3c4/i)).toBeInTheDocument()
  })
})
