/**
 * Formats how long ago `dateInput` was, in the coarsest unit that fits:
 * seconds up to 59s, minutes up to 59m, hours up to 23h, then days.
 */
export function formatRelativeTime(dateInput: string | Date, now: Date = new Date()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`
  }
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
