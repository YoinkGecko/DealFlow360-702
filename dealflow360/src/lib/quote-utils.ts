import type { QuoteStatus } from './types'

export function riskLevelFromScore(score: number | null): 'low' | 'medium' | 'high' {
  if (score === null || score <= 0) return 'low'
  if (score < 0.15) return 'low'
  if (score < 0.35) return 'medium'
  return 'high'
}

export function formatRiskPercent(score: number | null): string {
  if (score === null) return '—'
  return `${(score * 100).toFixed(1)}%`
}

export function quoteTotal(lines: Array<{ lineValue: number }>): number {
  return lines.reduce((s, l) => s + l.lineValue, 0)
}

export function avgDiscount(lines: Array<{ discountPercent: number }>): number {
  if (lines.length === 0) return 0
  return lines.reduce((s, l) => s + l.discountPercent, 0) / lines.length
}

export function shortQuoteId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

export const STATUS_TABS: Array<{ key: string; status?: QuoteStatus }> = [
  { key: 'all' },
  { key: 'DRAFT', status: 'DRAFT' },
  { key: 'PENDING_APPROVAL', status: 'PENDING_APPROVAL' },
  { key: 'APPROVED', status: 'APPROVED' },
  { key: 'SENT', status: 'SENT' },
  { key: 'UNDER_NEGOTIATION', status: 'UNDER_NEGOTIATION' },
  { key: 'CONFIRMED', status: 'CONFIRMED' },
  { key: 'REJECTED', status: 'REJECTED' },
]

export function stageIndexFromStatus(status: QuoteStatus): number {
  const map: Record<QuoteStatus, number> = {
    DRAFT: 0,
    SENT: 1,
    UNDER_NEGOTIATION: 1,
    PENDING_APPROVAL: 2,
    APPROVED: 3,
    REJECTED: 2,
    CONFIRMED: 5,
  }
  return map[status] ?? 0
}

export function formatQuoteStatus(status: QuoteStatus): string {
  return status.replace(/_/g, ' ')
}
