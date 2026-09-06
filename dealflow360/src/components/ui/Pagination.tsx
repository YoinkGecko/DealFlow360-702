import { Button } from './Button'

interface Props {
  page: number
  pageCount: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageCount, total, onPageChange }: Props) {
  if (total === 0) return null

  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-sm text-[var(--color-muted)]">
      <span>
        Page {page} of {pageCount} · {total} total
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
