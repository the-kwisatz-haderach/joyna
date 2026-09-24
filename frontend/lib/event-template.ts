export type TemplateDateOption =
  | 'none'
  | 'today'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type TemplateRsvpDeadlineUnit = 'day' | 'week' | 'month'

export type EventTemplate = {
  id: string
  name: string
  icon: string
  title: string
  dateOption: TemplateDateOption
  timeOfDay?: string
  location: string
  rsvpDeadlineAmount?: number
  rsvpDeadlineUnit?: TemplateRsvpDeadlineUnit
  mood?: string
  description: string
}

const WEEKDAYS: TemplateDateOption[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

// "coming Monday" resolves to the nearest Monday from `now`, which is *today*
// if today already is a Monday — matching how the phrase reads colloquially,
// and how a user picking a weekday template a few hours before that day's
// event would expect it to behave.
export function resolveTemplateDate(dateOption: TemplateDateOption, now: Date = new Date()): Date | undefined {
  if (dateOption === 'none') return undefined
  if (dateOption === 'today') return now
  const targetDay = WEEKDAYS.indexOf(dateOption)
  if (targetDay === -1) return undefined
  const diff = (targetDay - now.getDay() + 7) % 7
  const result = new Date(now)
  result.setDate(now.getDate() + diff)
  return result
}

const PERIOD_TIMES: Record<string, string> = {
  morning: '09:00',
  afternoon: '14:00',
  evening: '18:00',
  night: '21:00',
}

// timeOfDay is either a concrete "HH:MM" clock time or a vague period-of-day
// keyword (see internal/eventtemplate/model.go's validTimeOfDay) — resolve
// either into an "HH:MM" value the <input type="time"> can use directly.
export function resolveTemplateTime(timeOfDay: string | undefined, fallback = '18:00'): string {
  if (!timeOfDay) return fallback
  if (/^\d{2}:\d{2}$/.test(timeOfDay)) return timeOfDay
  return PERIOD_TIMES[timeOfDay] ?? fallback
}

const DATE_OPTION_LABELS: Record<Exclude<TemplateDateOption, 'none'>, string> = {
  today: 'today',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

/** e.g. "RSVP 2 weeks before" — pluralizes the unit when the amount isn't 1. */
function formatRsvpDeadlineLabel(amount: number, unit: TemplateRsvpDeadlineUnit): string {
  return `RSVP ${amount} ${unit}${amount === 1 ? '' : 's'} before`
}

/** Short " · "-joined summary shown on a template card, e.g. "Chill · Saturday, 14:00 · Ye ol' pub". */
export function summarizeTemplate(template: EventTemplate): string {
  const parts: string[] = []
  if (template.mood) {
    parts.push(template.mood.charAt(0).toUpperCase() + template.mood.slice(1))
  }

  const dateLabel = template.dateOption !== 'none' ? DATE_OPTION_LABELS[template.dateOption] : undefined
  if (dateLabel && template.timeOfDay) {
    parts.push(`${dateLabel}, ${template.timeOfDay}`)
  } else if (dateLabel) {
    parts.push(dateLabel)
  } else if (template.timeOfDay) {
    parts.push(template.timeOfDay)
  } else if (template.rsvpDeadlineAmount && template.rsvpDeadlineUnit) {
    parts.push(formatRsvpDeadlineLabel(template.rsvpDeadlineAmount, template.rsvpDeadlineUnit))
  }

  if (template.location) {
    parts.push(template.location)
  }
  return parts.join(' · ')
}
