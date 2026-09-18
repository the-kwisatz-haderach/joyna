import { HugeiconsIcon } from '@hugeicons/react'
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'

// There's no backend notification domain yet (see the integration plan's
// "frontend-only" scope), so this always renders the empty state — showing
// fabricated notification content would be misleading in production.
function Notifications() {
  return (
    <section className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-20 text-center font-body">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-joyna-mint/15 text-joyna-mint-dark">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-8 w-8" strokeWidth={1.8} />
      </div>
      <h2 className="font-display text-lg font-semibold text-joyna-ink">You&rsquo;re all caught up</h2>
      <p className="text-sm text-joyna-ink-soft">Notifications about your events will show up here.</p>
    </section>
  )
}

export default Notifications
