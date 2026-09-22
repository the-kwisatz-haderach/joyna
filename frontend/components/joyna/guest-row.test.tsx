import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GuestRow, type Guest } from './guest-row'

describe('GuestRow', () => {
  it('shows a host badge next to the host’s name', () => {
    const host: Guest = { id: '1', name: 'Ada Lovelace', isHost: true }
    render(<GuestRow guest={host} />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByLabelText('Host')).toBeInTheDocument()
  })

  it('does not show a host badge for a regular guest', () => {
    const guest: Guest = { id: '2', name: 'Alan Turing', status: 'going', group: 'Bandmates' }
    render(<GuestRow guest={guest} />)

    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
    expect(screen.queryByLabelText('Host')).not.toBeInTheDocument()
  })

  it('shows the decline reason under the name for a not-attending guest', () => {
    const guest: Guest = {
      id: '3',
      name: 'Will',
      status: 'not_attending',
      group: 'Acquaintances',
      reason: 'Already have plans that evening, sorry!',
    }
    render(<GuestRow guest={guest} />)

    expect(screen.getByText('Will')).toBeInTheDocument()
    expect(
      screen.getByText(/Already have plans that evening, sorry!/),
    ).toBeInTheDocument()
  })

  it('does not show a reason for a not-attending guest who left none', () => {
    const guest: Guest = { id: '4', name: 'Grace Hopper', status: 'not_attending', group: 'Acquaintances' }
    render(<GuestRow guest={guest} />)

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.queryByText(/plans/)).not.toBeInTheDocument()
  })
})
