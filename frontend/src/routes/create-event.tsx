import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Location01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { MoodPicker } from '../../components/joyna/mood-picker'

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

const dateCaptionFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })

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
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState('18:00')
  const [location, setLocation] = useState('')
  const [rsvpAmount, setRsvpAmount] = useState(1)
  const [rsvpUnit, setRsvpUnit] = useState<RsvpUnit>('day')
  const [moodId, setMoodId] = useState('')
  const [description, setDescription] = useState('')

  const eventDate = useMemo(() => (date ? combineDateAndTime(date, time) : undefined), [date, time])
  const rsvpDeadline = useMemo(() => {
    if (!eventDate) return undefined
    return new Date(eventDate.getTime() - rsvpAmount * UNIT_IN_MS[rsvpUnit])
  }, [eventDate, rsvpAmount, rsvpUnit])

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
          location,
          description,
          type: DEFAULT_EVENT_TYPE,
          rsvpDeadline: rsvpDeadline?.toISOString(),
          defaultSpreadAllowed: 0,
          mood: moodId || undefined,
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
      <h1 className="font-display text-xl font-semibold text-joyna-ink">Create event</h1>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Title
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10 rounded-field bg-white"
          />
        </label>

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
              className="h-10 w-32 rounded-field bg-white"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-joyna-ink-soft">Location</span>
          <Input
            placeholder="Search for a place…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-10 rounded-field bg-white"
          />
          <div className="flex h-28 items-center justify-center rounded-card border border-dashed border-joyna-border-strong bg-joyna-border/40 text-joyna-ink-faint">
            Map preview
          </div>
          {location && (
            <div className="flex items-center gap-1.5 text-xs text-joyna-ink-soft">
              <HugeiconsIcon icon={Location01Icon} className="h-3.5 w-3.5" strokeWidth={2} />
              {location}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-joyna-ink-soft">RSVP deadline</span>
          <div className="flex items-center gap-2 text-sm text-joyna-ink">
            <select
              value={rsvpAmount}
              onChange={(e) => setRsvpAmount(Number(e.target.value))}
              className="h-10 rounded-field border border-joyna-border-strong bg-white px-2 text-sm"
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
              className="h-10 rounded-field border border-joyna-border-strong bg-white px-2 text-sm"
            >
              <option value="day">day(s)</option>
              <option value="week">week(s)</option>
              <option value="month">month(s)</option>
            </select>
            <span>before</span>
          </div>
          {rsvpDeadline && (
            <p className="text-xs text-joyna-ink-faint">
              Guests must respond by {dateCaptionFormatter.format(rsvpDeadline)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-joyna-ink-soft">Mood</span>
          <MoodPicker value={moodId} onChange={setMoodId} />
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Description
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="rounded-field bg-white"
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
