import { cn } from '../../lib/utils'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'text-left text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-table-header-bg)]',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  onClick,
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  onClick?: () => void
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-4 py-3 border-b border-[var(--color-border)] text-[var(--color-text)]',
        onClick && 'cursor-pointer hover:bg-[var(--color-table-row-hover)]',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('transition-colors', className)}>{children}</tr>
}
