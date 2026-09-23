import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GuestList } from './guest-list'
import type { Guest } from './guest-row'

const guests: Guest[] = [
  { id: 'host', name: 'Ada Lovelace', isHost: true },
  { id: 'going-1', name: 'Margaret Hamilton', status: 'going', group: 'Bandmates' },
  { id: 'pending-1', name: 'Alan Turing', status: 'pending', group: 'Bandmates' },
  { id: 'declined-1', name: 'Hedy Lamarr', status: 'not_attending', group: 'Bandmates' },
]

describe('GuestList', () => {
  it('lists attending guests directly below the host without a "Going" heading, keeping "Pending" and "Not attending"', () => {
    render(
      <GuestList
        eventTitle="Summer Rooftop Party"
        guests={guests}
        candidates={[]}
        onCommit={() => {}}
      />,
    )

    expect(screen.queryByText('Going')).not.toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Not attending')).toBeInTheDocument()

    const names = screen
      .getAllByText(/Ada Lovelace|Margaret Hamilton|Alan Turing|Hedy Lamarr/)
      .map((el) => el.textContent)
    expect(names).toEqual([
      'Ada Lovelace',
      'Margaret Hamilton',
      'Alan Turing',
      'Hedy Lamarr',
    ])
  })
})
