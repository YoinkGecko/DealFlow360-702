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
        'text-left text-xs font-medium text-[#6b7280] uppercase tracking-wide px-4 py-3 border-b border-[#e8eaed] bg-[#fafbfc]',
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
      className={cn('px-4 py-3 border-b border-[#e8eaed] text-[#1a1d21]', onClick && 'cursor-pointer hover:bg-[#fafbfc]', className)}
      onClick={onClick}
    >
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('transition-colors', className)}>{children}</tr>
}
