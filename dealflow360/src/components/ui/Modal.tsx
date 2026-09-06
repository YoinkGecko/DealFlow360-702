import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--color-overlay)]" onClick={onClose} />
      <div className={cn('relative bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-xl w-full animate-in text-[var(--color-text)]', sizes[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-hover)] text-[var(--color-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[var(--color-overlay)]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-xl flex flex-col animate-in h-full text-[var(--color-text)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-hover)] text-[var(--color-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12 px-4">
      <h3 className="text-sm font-medium text-[var(--color-text)]">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] mt-1 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export { Button }
