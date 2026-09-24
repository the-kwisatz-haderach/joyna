import { describe, expect, it } from 'vitest'

import { resolveTemplateDate, resolveTemplateTime, summarizeTemplate, type EventTemplate } from './event-template'

// A Wednesday.
const NOW = new Date('2026-09-23T12:00:00Z')

describe('resolveTemplateDate', () => {
  it('returns undefined for "none"', () => {
    expect(resolveTemplateDate('none', NOW)).toBeUndefined()
  })

  it('returns now for "today"', () => {
    expect(resolveTemplateDate('today', NOW)).toBe(NOW)
  })

  it('returns today when the target weekday matches today', () => {
    const result = resolveTemplateDate('wednesday', NOW)
    expect(result?.toISOString().slice(0, 10)).toBe('2026-09-23')
  })

  it('resolves to the next occurrence of a weekday later this week', () => {
    const result = resolveTemplateDate('monday', NOW)
    expect(result?.toISOString().slice(0, 10)).toBe('2026-09-28')
  })

  it('resolves to the next occurrence of a weekday earlier this week (wraps to next week)', () => {
    const result = resolveTemplateDate('sunday', NOW)
    expect(result?.toISOString().slice(0, 10)).toBe('2026-09-27')
  })
})

describe('resolveTemplateTime', () => {
  it('passes through an HH:MM clock time', () => {
    expect(resolveTemplateTime('17:00')).toBe('17:00')
  })

  it('maps period-of-day keywords to a representative clock time', () => {
    expect(resolveTemplateTime('evening')).toBe('18:00')
    expect(resolveTemplateTime('morning')).toBe('09:00')
  })

  it('falls back when timeOfDay is missing', () => {
    expect(resolveTemplateTime(undefined)).toBe('18:00')
    expect(resolveTemplateTime(undefined, '09:30')).toBe('09:30')
  })
})

function template(overrides: Partial<EventTemplate> = {}): EventTemplate {
  return {
    id: 'template-1',
    name: 'Test template',
    icon: '🎉',
    title: 'Test event',
    dateOption: 'none',
    location: '',
    description: '',
    ...overrides,
  }
}

describe('summarizeTemplate', () => {
  it('joins mood, date+time and location', () => {
    const summary = summarizeTemplate(
      template({ mood: ['chill'], dateOption: 'today', timeOfDay: '17:00', location: "Ye ol' pub" }),
    )
    expect(summary).toBe("Chill · today, 17:00 · Ye ol' pub")
  })

  it('joins multiple moods with a comma', () => {
    const summary = summarizeTemplate(template({ mood: ['chill', 'cozy'], location: 'at home' }))
    expect(summary).toBe('Chill, Cozy · at home')
  })

  it('falls back to the RSVP deadline when there is no date', () => {
    const summary = summarizeTemplate(template({ mood: ['party'], rsvpDeadlineAmount: 1, rsvpDeadlineUnit: 'week' }))
    expect(summary).toBe('Party · RSVP 1 week before')
  })

  it('pluralizes the RSVP deadline unit when the amount is not 1', () => {
    const summary = summarizeTemplate(template({ mood: ['party'], rsvpDeadlineAmount: 2, rsvpDeadlineUnit: 'month' }))
    expect(summary).toBe('Party · RSVP 2 months before')
  })

  it('shows a bare time when there is no date option but a timeOfDay is set', () => {
    const summary = summarizeTemplate(
      template({ mood: ['cozy'], timeOfDay: 'evening', location: 'at home' }),
    )
    expect(summary).toBe('Cozy · evening · at home')
  })
})
