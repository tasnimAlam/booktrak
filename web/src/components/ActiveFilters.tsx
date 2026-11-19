import type { Filters } from '../types.ts'
import { CloseIcon } from './Icons.tsx'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  onClear: () => void
}

function pageRangeLabel(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${min}–${max} pages`
  if (min !== null) return `≥ ${min} pages`
  if (max !== null) return `≤ ${max} pages`
  return null
}

export default function ActiveFilters({ filters, onChange, onClear }: Props) {
  const range = pageRangeLabel(filters.minPages, filters.maxPages)
  const chips = [
    ...filters.authors.map((a) => ({
      key: `a:${a}`, label: a,
      remove: () => onChange({ ...filters, authors: filters.authors.filter((x) => x !== a) }),
    })),
    ...filters.genres.map((g) => ({
      key: `g:${g}`, label: g,
      remove: () => onChange({ ...filters, genres: filters.genres.filter((x) => x !== g) }),
    })),
    ...(range
      ? [{ key: 'pages', label: range, remove: () => onChange({ ...filters, minPages: null, maxPages: null }) }]
      : []),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-medium text-muted">Active filters:</span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          aria-label={`Remove filter ${c.label}`}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-2xl border border-chip-line bg-chip px-3 text-[13px] font-medium text-chip-ink hover:border-chip-ink"
        >
          {c.label}
          <CloseIcon />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="min-h-8 cursor-pointer px-1 text-[13px] font-medium text-brand underline"
      >
        Clear all
      </button>
    </div>
  )
}
