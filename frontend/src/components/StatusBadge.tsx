import type { QuoteStatus } from "../data/mock"
import { statusLabel } from "../data/calc"

const classFor: Record<QuoteStatus, string> = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SENT: "sent",
  CONFIRMED: "confirmed",
}

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return <span className={`badge ${classFor[status]}`}>{statusLabel(status)}</span>
}
