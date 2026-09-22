import { cn } from '@/lib/utils'

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) {
    return null
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-2 text-sm">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="px-1 font-semibold text-joyna-ink-soft disabled:text-joyna-ink-faint disabled:opacity-50"
      >
        ‹ Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-control border font-semibold transition-colors',
            p === page
              ? 'border-joyna-ink bg-joyna-ink text-white'
              : 'border-joyna-border-strong bg-white text-joyna-ink-soft',
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="px-1 font-semibold text-joyna-ink-soft disabled:text-joyna-ink-faint disabled:opacity-50"
      >
        Next ›
      </button>
    </nav>
  )
}
