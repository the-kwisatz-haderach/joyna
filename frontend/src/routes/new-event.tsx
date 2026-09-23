import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { AddTemplateCard, TemplateCard } from '../../components/joyna/template-card'
import type { EventTemplate } from '@/lib/event-template'

async function fetchTemplates(): Promise<EventTemplate[]> {
  const response = await fetch('/api/event-templates', { credentials: 'include' })
  if (!response.ok) {
    throw new Error('failed to load event templates')
  }
  return (await response.json()) as EventTemplate[]
}

function NewEvent() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<EventTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchTemplates()
      .then((data) => {
        if (!cancelled) setTemplates(data)
      })
      .catch(() => {
        // Templates are an optional convenience — fall back to an empty
        // list so "Empty event" is still usable if this request fails.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function selectTemplate(template?: EventTemplate) {
    navigate('/events/new/blank', { state: template ? { template } : undefined })
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-semibold text-joyna-ink">New event</h1>
        <p className="text-sm text-joyna-ink-faint">Start from a template, or build one from scratch.</p>
      </div>

      <AddTemplateCard
        title="Empty event"
        description="Start from scratch — fill in everything yourself"
        onClick={() => selectTemplate()}
      />

      {!isLoading && templates.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-joyna-ink-faint uppercase">
              Templates
            </h2>
            <Link to="/events/templates" className="text-xs font-semibold text-joyna-coral">
              Manage
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} onClick={() => selectTemplate(template)} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default NewEvent
