import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { AddTemplateCard, TemplateCard } from '../../components/joyna/template-card'
import type { EventTemplate } from '@/lib/event-template'

async function fetchTemplates(): Promise<EventTemplate[]> {
  const response = await fetch('/api/event-templates', { credentials: 'include' })
  if (!response.ok) {
    throw new Error('failed to load event templates')
  }
  return (await response.json()) as EventTemplate[]
}

function ManageTemplates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<EventTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTemplates()
      .then((data) => {
        if (!cancelled) setTemplates(data)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your templates. Please try again later.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-semibold text-joyna-ink">Manage templates</h1>
        <p className="text-sm text-joyna-ink-faint">Tap a template to edit it, or add a new one.</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-joyna-red-dark">
          {error}
        </p>
      )}

      <AddTemplateCard
        title="New template"
        description="Save a new event setup to reuse later"
        onClick={() => navigate('/events/templates/new')}
      />

      {isLoading ? (
        <p className="text-sm text-joyna-ink-faint">Loading your templates…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => navigate(`/events/templates/${template.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default ManageTemplates
