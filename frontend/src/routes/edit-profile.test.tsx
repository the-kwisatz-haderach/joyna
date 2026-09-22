import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthProvider } from '../auth-context'
import { mockUsers } from '../mocks/data'
import EditProfile from './edit-profile'

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

function renderEditProfile() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/profile/edit']}>
        <Routes>
          <Route path="/profile" element={<div>Profile page</div>} />
          <Route path="/profile/edit" element={<EditProfile />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('EditProfile', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("pre-fills the form with the current user's name", () => {
    loginAsMockUser()
    renderEditProfile()

    expect(screen.getByLabelText(/name/i)).toHaveValue(mockUsers[0].name)
    expect(screen.getByLabelText(/location/i)).toHaveValue('')
  })

  it('gives the form fields a white background', () => {
    loginAsMockUser()
    renderEditProfile()

    expect(screen.getByLabelText(/name/i).className).toMatch(/bg-white/)
    expect(screen.getByLabelText(/location/i).className).toMatch(/bg-white/)
  })

  it('navigates back to the profile page on cancel', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEditProfile()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByText('Profile page')).toBeInTheDocument()
  })

  it('saves the updated name and location and navigates back to the profile page', async () => {
    const user = userEvent.setup()
    loginAsMockUser()
    renderEditProfile()

    const nameField = screen.getByLabelText(/name/i)
    await user.clear(nameField)
    await user.type(nameField, 'Ada Byron')
    await user.type(screen.getByLabelText(/location/i), 'Stockholm')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText('Profile page')).toBeInTheDocument()
    })
    const stored = JSON.parse(localStorage.getItem('joyna.currentUser') ?? '{}')
    expect(stored.name).toBe('Ada Byron')
    expect(stored.address).toBe('Stockholm')
  })
})
