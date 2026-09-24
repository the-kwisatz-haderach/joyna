import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { summarizeTemplate, type EventTemplate } from '@/lib/event-template'

function CardChevron() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-joyna-border-strong text-joyna-ink-soft">
      <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" strokeWidth={2} />
    </span>
  )
}

export function TemplateCard({
  template,
  onClick,
  className,
}: {
  template: EventTemplate
  onClick?: () => void
  className?: string
}) {
  const summary = summarizeTemplate(template)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-card border border-joyna-border bg-white p-4 text-left transition-colors hover:border-joyna-border-strong',
        className,
      )}
    >
      {template.icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-joyna-sunflower/20 text-xl">
          {template.icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm font-semibold text-joyna-ink">
          {template.name}
        </span>
        {summary && <span className="truncate text-xs text-joyna-ink-faint">{summary}</span>}
      </div>
      <CardChevron />
    </button>
  )
}

/** "Empty event" / "New template" dashed placeholder card, shared by the new-event picker and manage-templates screen. */
export function AddTemplateCard({
  title,
  description,
  onClick,
  className,
}: {
  title: string
  description: string
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-card border border-dashed border-joyna-border-strong bg-transparent p-4 text-left transition-colors hover:bg-white',
        className,
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-joyna-border-strong bg-white text-joyna-coral">
        <HugeiconsIcon icon={PlusSignIcon} className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm font-semibold text-joyna-ink">{title}</span>
        <span className="truncate text-xs text-joyna-ink-faint">{description}</span>
      </div>
      <CardChevron />
    </button>
  )
}
