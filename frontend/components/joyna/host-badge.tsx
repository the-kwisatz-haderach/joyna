/** Small crown badge marking an event's host — used on the events listing page and in guest lists. */
export function HostBadge({ label = 'Host' }: { label?: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-joyna-sunflower text-joyna-sunflower-dark"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 8l4.5 3.2L12 4l4.5 7.2L21 8l-2 10H5L3 8z" />
      </svg>
    </span>
  )
}
