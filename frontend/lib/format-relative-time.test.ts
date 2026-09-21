import { describe, expect, it } from 'vitest'

import { formatRelativeTime } from './format-relative-time'

const NOW = new Date('2026-06-15T12:00:00Z')

describe('formatRelativeTime', () => {
  it('formats sub-minute durations in seconds', () => {
    expect(formatRelativeTime(new Date('2026-06-15T11:59:30Z'), NOW)).toBe('30s ago')
    expect(formatRelativeTime(NOW, NOW)).toBe('0s ago')
  })

  it('formats sub-hour durations in minutes', () => {
    expect(formatRelativeTime(new Date('2026-06-15T11:45:00Z'), NOW)).toBe('15m ago')
    expect(formatRelativeTime(new Date('2026-06-15T11:00:01Z'), NOW)).toBe('59m ago')
  })

  it('formats sub-day durations in hours', () => {
    expect(formatRelativeTime(new Date('2026-06-15T09:00:00Z'), NOW)).toBe('3h ago')
    expect(formatRelativeTime(new Date('2026-06-14T13:00:00Z'), NOW)).toBe('23h ago')
  })

  it('formats durations of a day or more in days', () => {
    expect(formatRelativeTime(new Date('2026-06-14T12:00:00Z'), NOW)).toBe('1d ago')
    expect(formatRelativeTime(new Date('2026-06-10T12:00:00Z'), NOW)).toBe('5d ago')
  })

  it('accepts an ISO date string', () => {
    expect(formatRelativeTime('2026-06-15T11:59:00Z', NOW)).toBe('1m ago')
  })
})
