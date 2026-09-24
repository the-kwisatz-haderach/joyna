import { useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { MoodPicker } from '../../components/joyna/mood-picker'
import { IconPicker } from '../../components/joyna/icon-picker'
import { LocationField, type LocationCoordinates } from '../../components/joyna/location-field'
import { resolveTemplateDate, resolveTemplateTime, type EventTemplate } from '@/lib/event-template'
import { useAuth } from '../auth-context'

type RsvpUnit = 'day' | 'week' | 'month'

const UNIT_IN_MS: Record<RsvpUnit, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
}

// The new design has no Type/spread controls — every event created here is
// "other" with no default spread, matching the exhaustive field list in
// docs/design/screens-export/SCREENS.md screen 04.
const DEFAULT_EVENT_TYPE = 'other'

function formatRsvpDeadlineCaption(deadline: Date): string {
  const day = deadline.getDate()
  const month = deadline.toLocaleString('en', { month: 'short' })
  const year = deadline.getFullYear()
  return year === new Date().getFullYear() ? `${day} ${month}` : `${day} ${month}, ${year}`
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const combined = new Date(date)
  combined.setHours(hours || 0, minutes || 0, 0, 0)
  return combined
}

type CreatedEvent = {
  id: string
}

function CreateEvent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const location = useLocation()
  const template = (location.state as { template?: EventTemplate } | null)?.template
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState(template?.title ?? '')
  const [icon, setIcon] = useState(template?.icon ?? '')
  const [date, setDate] = useState<Date | undefined>(() => template && resolveTemplateDate(template.dateOption))
  const [time, setTime] = useState(() => resolveTemplateTime(template?.timeOfDay))
  // Pre-fills from a chosen template's location, falling back to the
  // profile's saved address per the copy on the register form ("used to
  // pre-fill the location when you create events") — still fully editable.
  const [eventLocation, setEventLocation] = useState(template?.location || user?.address || '')
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null)
  const hasRsvpFromTemplate = Boolean(template?.rsvpDeadlineAmount && template?.rsvpDeadlineUnit)
  const [hasRsvpDeadline, setHasRsvpDeadline] = useState(hasRsvpFromTemplate)
  const [rsvpAmount, setRsvpAmount] = useState(template?.rsvpDeadlineAmount ?? 1)
  const [rsvpUnit, setRsvpUnit] = useState<RsvpUnit>(template?.rsvpDeadlineUnit ?? 'day')
  const [moods, setMoods] = useState<string[]>(template?.mood ?? [])
  const [description, setDescription] = useState(template?.description ?? '')

  const eventDate = useMemo(() => (date ? combineDateAndTime(date, time) : undefined), [date, time])
  const rsvpDeadline = useMemo(() => {
    if (!eventDate || !hasRsvpDeadline) return undefined
    return new Date(eventDate.getTime() - rsvpAmount * UNIT_IN_MS[rsvpUnit])
  }, [eventDate, hasRsvpDeadline, rsvpAmount, rsvpUnit])

  function handleRemoveRsvpDeadline() {
    setHasRsvpDeadline(false)
    setRsvpAmount(1)
    setRsvpUnit('day')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!eventDate) {
      setError('Pick a date for the event.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          date: eventDate.toISOString(),
          location: eventLocation,
          description,
          type: DEFAULT_EVENT_TYPE,
          rsvpDeadline: rsvpDeadline?.toISOString(),
          defaultSpreadAllowed: 0,
          mood: moods,
          icon: icon || undefined,
          latitude: coordinates?.lat,
          longitude: coordinates?.lng,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        setError(message || 'Something went wrong. Please try again.')
        return
      }

      const created = (await response.json()) as CreatedEvent
      navigate(`/events/${created.id}`, { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6 font-body">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-joyna-ink">Create event</h1>
        {template && (
          <p className="text-sm text-joyna-ink-faint">
            {template.icon} Using the &ldquo;{template.name}&rdquo; template
          </p>
        )}
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Title
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10 rounded-xl bg-white"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-joyna-ink-soft">Icon</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-joyna-ink-soft">Mood</span>
          <MoodPicker value={moods} onChange={setMoods} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-joyna-ink-soft">Date &amp; time</span>
          <div className="rounded-card border border-joyna-border bg-white p-2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={{ before: new Date() }}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
            Time
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 w-32 rounded-xl bg-white"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-joyna-ink-soft">RSVP deadline</span>
          {hasRsvpDeadline ? (
            <>
              <div className="flex items-center gap-2 text-sm text-joyna-ink">
                <button
                  type="button"
                  aria-label="Remove RSVP deadline"
                  onClick={handleRemoveRsvpDeadline}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-joyna-ink-soft transition-colors hover:text-joyna-ink"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" strokeWidth={2} />
                </button>
                <select
                  value={rsvpAmount}
                  onChange={(e) => setRsvpAmount(Number(e.target.value))}
                  className="h-10 rounded-xl border border-joyna-border-strong bg-white px-2 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <select
                  value={rsvpUnit}
                  onChange={(e) => setRsvpUnit(e.target.value as RsvpUnit)}
                  className="h-10 rounded-xl border border-joyna-border-strong bg-white px-2 text-sm"
                >
                  <option value="day">day(s)</option>
                  <option value="week">week(s)</option>
                  <option value="month">month(s)</option>
                </select>
                <span>before</span>
              </div>
              {rsvpDeadline && (
                <p className="text-xs text-joyna-ink-faint">
                  Guests must respond by {formatRsvpDeadlineCaption(rsvpDeadline)}
                </p>
              )}
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-fit rounded-xl px-4 font-display text-sm"
              onClick={() => setHasRsvpDeadline(true)}
            >
              Add deadline
            </Button>
          )}
        </div>

        <LocationField
          value={eventLocation}
          onChange={setEventLocation}
          coordinates={coordinates}
          onCoordinatesChange={setCoordinates}
        />

        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Description
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-xl bg-white"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-joyna-red-dark">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="h-11 flex-1 rounded-control font-display text-sm"
            onClick={() => navigate('/events')}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-11 flex-1 rounded-control font-display text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default CreateEvent
