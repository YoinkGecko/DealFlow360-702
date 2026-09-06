import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

const styles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/30',
  danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]/30',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-brand)]/30',
  neutral: 'bg-[var(--color-bg)] text-[var(--color-muted)] border-[var(--color-border)]',
  purple: 'bg-[var(--color-badge-finance-bg)] text-[var(--color-badge-finance-text)] border-[var(--color-badge-finance-text)]/30',
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function RiskBadge({ level }: { level: string }) {
  const map: Record<string, BadgeVariant> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    none: 'neutral',
  }
  const label = level === 'none' ? 'No Risk' : `${level.charAt(0).toUpperCase()}${level.slice(1)} Risk`
  return <Badge variant={map[level] ?? 'neutral'}>{label}</Badge>
}

export function StageBadge({ stage }: { stage: string }) {
  const normalized = stage.toLowerCase()
  const labels: Record<string, string> = {
    draft: 'Draft',
    negotiation: 'Negotiation',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    fulfillment: 'Fulfillment',
    billed: 'Billed',
    paid: 'Paid',
    rejected: 'Rejected',
    sent: 'Sent',
    under_negotiation: 'Under Negotiation',
    confirmed: 'Confirmed',
  }
  const variants: Record<string, BadgeVariant> = {
    draft: 'neutral',
    negotiation: 'info',
    pending_approval: 'warning',
    approved: 'success',
    fulfillment: 'info',
    billed: 'purple',
    paid: 'success',
    rejected: 'danger',
    sent: 'info',
    under_negotiation: 'warning',
    confirmed: 'success',
  }
  const display =
    labels[normalized] ??
    stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return <Badge variant={variants[normalized] ?? 'default'}>{display}</Badge>
}
