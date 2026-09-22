import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './pagination'

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a button per page and marks the current one', () => {
    render(<Pagination page={2} totalPages={4} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
  })

  it('disables Prev on the first page and Next on the last page', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()

    rerender(<Pagination page={3} totalPages={3} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /prev/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('calls onChange with the target page when a page number, Prev, or Next is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Pagination page={2} totalPages={3} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: /prev/i }))
    expect(onChange).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(onChange).toHaveBeenCalledWith(3)
  })
})
