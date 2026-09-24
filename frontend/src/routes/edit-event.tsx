import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoodPicker } from '../../components/joyna/mood-picker'
import { IconPicker } from '../../components/joyna/icon-picker'
import { LocationField, type LocationCoordinates } from '../../components/joyna/location-field'

type RsvpUnit = 'day' | 'week' | 'month'

const UNIT_IN_MS: Record<RsvpUnit, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
}

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

function toTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

type EventDetailData = {
  id: string
  ownerId: string
  name: string
  description: string
  date: string
  location: string
  rsvpDeadline?: string
  isOwner: boolean
  mood?: string[]
  icon?: string
  latitude?: number
  longitude?: number
}

function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [initialIcon, setInitialIcon] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState('18:00')
  const [location, setLocation] = useState('')
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null)
  const [hasRsvpDeadline, setHasRsvpDeadline] = useState(false)
  const [rsvpAmount, setRsvpAmount] = useState(1)
  const [rsvpUnit, setRsvpUnit] = useState<RsvpUnit>('day')
  const [moods, setMoods] = useState<string[]>([])
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function loadEvent() {
      const response = await fetch(`/api/events/${id}`, { credentials: 'include' })
      if (!response.ok || cancelled) {
        setIsLoading(false)
        return
      }
      const event = (await response.json()) as EventDetailData
      const eventDate = new Date(event.date)
      setName(event.name)
      setDate(eventDate)
      setTime(toTimeString(eventDate))
      setLocation(event.location)
      setCoordinates(
        event.latitude != null && event.longitude != null
          ? { lat: event.latitude, lng: event.longitude }
          : null,
      )
      setDescription(event.description)
      setIcon(event.icon ?? '')
      setInitialIcon(event.icon ?? '')
      setMoods(event.mood ?? [])
      if (event.rsvpDeadline) {
        const deadline = new Date(event.rsvpDeadline)
        const diffMs = eventDate.getTime() - deadline.getTime()
        const diffDays = Math.max(1, Math.round(diffMs / UNIT_IN_MS.day))
        setHasRsvpDeadline(true)
        setRsvpAmount(diffDays)
        setRsvpUnit('day')
      }
      setIsLoading(false)
    }

    loadEvent()
    return () => {
      cancelled = true
    }
  }, [id])

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
    if (!id || !eventDate) return
    setError(null)
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          date: eventDate.toISOString(),
          location,
          description,
          rsvpDeadline: rsvpDeadline?.toISOString(),
          mood: moods,
          icon: icon || undefined,
          clearIcon: !icon && Boolean(initialIcon),
          latitude: coordinates?.lat,
          longitude: coordinates?.lng,
        }),
      })
      if (!response.ok) {
        const message = await response.text()
        setError(message || 'Something went wrong. Please try again.')
        return
      }
      navigate(`/events/${id}`, { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancelEvent() {
    if (!id) return
    setIsCancelling(true)
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!response.ok) {
        setError("Couldn't cancel the event. Please try again.")
        return
      }
      navigate('/events', { replace: true })
    } finally {
      setIsCancelling(false)
      setShowCancelConfirm(false)
    }
  }

  if (isLoading) {
    return <p className="px-6 py-16 text-center text-sm text-joyna-ink-faint">Loading event…</p>
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6 font-body">
      <h1 className="font-display text-xl font-semibold text-joyna-ink">Edit event</h1>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Title
          <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-10 rounded-xl bg-white" />
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
            <Calendar mode="single" selected={date} onSelect={setDate} disabled={{ before: new Date() }} />
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
            Time
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 w-32 rounded-xl bg-white" />
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
          value={location}
          onChange={setLocation}
          coordinates={coordinates}
          onCoordinatesChange={setCoordinates}
        />

        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Description
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-xl bg-white" />
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
            onClick={() => navigate(`/events/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-11 flex-1 rounded-control font-display text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2 rounded-card border border-joyna-red/20 bg-joyna-red/5 p-4">
        <Button
          type="button"
          className="h-11 w-full rounded-control bg-joyna-red font-display text-sm text-white hover:bg-joyna-red-dark"
          disabled={isCancelling}
          onClick={() => setShowCancelConfirm(true)}
        >
          {isCancelling ? 'Cancelling…' : 'Cancel event'}
        </Button>
        <p className="text-center text-xs text-joyna-ink-faint">
          Notifies all guests — this can&apos;t be undone.
        </p>
      </div>

      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cancelling event</DialogTitle>
            <DialogDescription>This notifies all guests and can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="rounded-control font-display text-sm"
              disabled={isCancelling}
              onClick={() => setShowCancelConfirm(false)}
            >
              Go back
            </Button>
            <Button
              type="button"
              className="rounded-control bg-joyna-red font-display text-sm text-white hover:bg-joyna-red-dark"
              disabled={isCancelling}
              onClick={handleCancelEvent}
            >
              {isCancelling ? 'Cancelling…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default EditEvent
