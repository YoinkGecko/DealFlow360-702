import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

const styles: Record<BadgeVariant, string> = {
  default: 'bg-[#f5f6f8] text-[#1a1d21] border-[#e8eaed]',
  success: 'bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]',
  warning: 'bg-[#fff4e5] text-[#ed6c02] border-[#ffe0b2]',
  danger: 'bg-[#ffebee] text-[#c62828] border-[#ffcdd2]',
  info: 'bg-[#e3f2fd] text-[#1565C0] border-[#bbdefb]',
  neutral: 'bg-[#f5f6f8] text-[#6b7280] border-[#e8eaed]',
  purple: 'bg-[#f3e5f5] text-[#7b1fa2] border-[#e1bee7]',
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
