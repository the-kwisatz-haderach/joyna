import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Delete02Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import type { EventTemplate, TemplateDateOption, TemplateRsvpDeadlineUnit } from '@/lib/event-template'

const DATE_OPTIONS: { value: TemplateDateOption; label: string }[] = [
  { value: 'none', label: 'No preset date' },
  { value: 'today', label: 'Today' },
  { value: 'monday', label: 'Coming Monday' },
  { value: 'tuesday', label: 'Coming Tuesday' },
  { value: 'wednesday', label: 'Coming Wednesday' },
  { value: 'thursday', label: 'Coming Thursday' },
  { value: 'friday', label: 'Coming Friday' },
  { value: 'saturday', label: 'Coming Saturday' },
  { value: 'sunday', label: 'Coming Sunday' },
]

// Mirrors the amount+unit RSVP deadline picker on the event creation form
// (see create-event.tsx) so templates can express the same deadlines
// ("2 weeks before") instead of a fixed set of presets.
const RSVP_AMOUNTS = [1, 2, 3, 4, 5, 6, 7]

async function fetchTemplates(): Promise<EventTemplate[]> {
  const response = await fetch('/api/event-templates', { credentials: 'include' })
  if (!response.ok) {
    throw new Error('failed to load event templates')
  }
  return (await response.json()) as EventTemplate[]
}

function TemplateForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [isLoading, setIsLoading] = useState(isEditing)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [initialIcon, setInitialIcon] = useState('')
  const [title, setTitle] = useState('')
  const [dateOption, setDateOption] = useState<TemplateDateOption>('none')
  const [timeOfDay, setTimeOfDay] = useState('')
  const [location, setLocation] = useState('')
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null)
  const [hasRsvpDeadline, setHasRsvpDeadline] = useState(false)
  const [rsvpAmount, setRsvpAmount] = useState(1)
  const [rsvpUnit, setRsvpUnit] = useState<TemplateRsvpDeadlineUnit>('day')
  const [moods, setMoods] = useState<string[]>([])
  const [description, setDescription] = useState('')

  function handleRemoveRsvpDeadline() {
    setHasRsvpDeadline(false)
    setRsvpAmount(1)
    setRsvpUnit('day')
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchTemplates()
      .then((templates) => {
        if (cancelled) return
        const found = templates.find((candidate) => candidate.id === id)
        if (!found) {
          setError("Couldn't find that template.")
          return
        }
        setName(found.name)
        setIcon(found.icon ?? '')
        setInitialIcon(found.icon ?? '')
        setTitle(found.title)
        setDateOption(found.dateOption)
        setTimeOfDay(found.timeOfDay ?? '')
        setLocation(found.location)
        setHasRsvpDeadline(Boolean(found.rsvpDeadlineAmount && found.rsvpDeadlineUnit))
        setRsvpAmount(found.rsvpDeadlineAmount ?? 1)
        setRsvpUnit(found.rsvpDeadlineUnit ?? 'day')
        setMoods(found.mood ?? [])
        setDescription(found.description)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load that template. Please try again later.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name,
        title,
        dateOption,
        location,
        description,
        mood: moods,
      }
      if (icon) {
        body.icon = icon
      } else if (isEditing && initialIcon) {
        body.clearIcon = true
      }
      if (timeOfDay.trim()) {
        body.timeOfDay = timeOfDay.trim()
      } else if (isEditing) {
        body.clearTimeOfDay = true
      }
      if (hasRsvpDeadline) {
        body.rsvpDeadlineAmount = rsvpAmount
        body.rsvpDeadlineUnit = rsvpUnit
      } else if (isEditing) {
        body.clearRsvpDeadline = true
      }

      const response = await fetch(
        isEditing ? `/api/event-templates/${id}` : '/api/event-templates',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        const message = await response.text()
        setError(message || 'Something went wrong. Please try again.')
        return
      }
      navigate('/events/templates', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setIsDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/event-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('failed to delete template')
      }
      navigate('/events/templates', { replace: true })
    } catch {
      setError("Couldn't delete that template. Please try again.")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="px-6 py-16 text-center text-sm text-joyna-ink-faint">Loading template…</p>
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6 font-body">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-joyna-ink">
          {isEditing ? 'Edit template' : 'New template'}
        </h1>
        {isEditing && (
          <button
            type="button"
            aria-label="Delete template"
            onClick={() => setConfirmingDelete(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-joyna-red/10 transition-transform active:scale-90"
          >
            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 text-joyna-red" strokeWidth={2} />
          </button>
        )}
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Template name
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Afterwork today"
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

        <hr className="border-joyna-border" />

        <label className="flex flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
          Event title
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Afterwork drinks"
            className="h-10 rounded-xl bg-white"
          />
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
              Date
              <select
                value={dateOption}
                onChange={(e) => setDateOption(e.target.value as TemplateDateOption)}
                className="h-10 rounded-xl border border-joyna-border-strong bg-white px-2 text-sm"
              >
                {DATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-joyna-ink-soft">
              Time of day
              <Input
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                placeholder="17:00 or evening"
                className="h-10 rounded-xl bg-white"
              />
            </label>
          </div>
          <p className="text-xs text-joyna-ink-faint">
            The exact date is worked out each time you use this template.
          </p>
        </div>

        <LocationField
          value={location}
          onChange={setLocation}
          coordinates={coordinates}
          onCoordinatesChange={setCoordinates}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-joyna-ink-soft">RSVP deadline</span>
          {hasRsvpDeadline ? (
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
                {RSVP_AMOUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select
                value={rsvpUnit}
                onChange={(e) => setRsvpUnit(e.target.value as TemplateRsvpDeadlineUnit)}
                className="h-10 rounded-xl border border-joyna-border-strong bg-white px-2 text-sm"
              >
                <option value="day">day(s)</option>
                <option value="week">week(s)</option>
                <option value="month">month(s)</option>
              </select>
              <span>before</span>
            </div>
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
            onClick={() => navigate('/events/templates')}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-11 flex-1 rounded-control font-display text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </form>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="max-w-[280px] rounded-2xl text-center font-body">
          <DialogHeader className="items-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-joyna-red/10">
              <HugeiconsIcon icon={Delete02Icon} className="h-5 w-5 text-joyna-red" strokeWidth={2} />
            </div>
            <DialogTitle className="font-display text-[15px]">Delete &ldquo;{name}&rdquo;?</DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              This can&rsquo;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="h-11 w-full rounded-control font-display text-sm"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting…' : 'Delete template'}
            </Button>
            <Button
              variant="secondary"
              className="h-11 w-full rounded-control font-display text-sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default TemplateForm
