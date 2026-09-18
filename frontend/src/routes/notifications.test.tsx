import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Notifications from './notifications'

describe('Notifications', () => {
  it('renders the all-caught-up empty state', () => {
    render(<Notifications />)

    expect(
      screen.getByRole('heading', { name: /you.re all caught up/i }),
    ).toBeInTheDocument()
  })
})
