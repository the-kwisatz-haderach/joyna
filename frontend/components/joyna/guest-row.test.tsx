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
})
