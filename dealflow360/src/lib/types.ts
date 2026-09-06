export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'UNDER_NEGOTIATION'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONFIRMED'

export type ApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'

export type ChangeRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type ChangeRequestType = 'COMMENT' | 'COUNTER_DISCOUNT' | 'GENERAL_CHANGE'

export interface ApiCustomer {
  id: string
  name: string
  email: string
  customerTierId: string
  tier: { id: string; name: string }
  createdAt: string
}

export interface ApiProduct {
  id: string
  name: string
  category: string
  unitPrice: number | string
  description?: string | null
}

export interface ApiQuoteLine {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  discountPercent: number
  lineValue: number
  product?: { id: string; name: string; category: string }
}

export interface ApiApproval {
  id: string
  approverRole: string
  decision: ApprovalDecision
  reason: string | null
  decidedAt: string | null
  sortOrder: number
}

export interface ApiQuote {
  id: string
  customerId: string
  repUserId: string
  status: QuoteStatus
  blendedRiskScore: number | null
  createdAt: string
  updatedAt: string
  lines: ApiQuoteLine[]
  approvals: ApiApproval[]
  customer?: { id: string; name: string; email?: string; tier: { name: string } }
}

export interface ApiChangeRequest {
  id: string
  quoteId: string
  quoteLineId: string | null
  type: ChangeRequestType
  proposedDiscountPercent: number | null
  message: string | null
  status: ChangeRequestStatus
  createdAt: string
  resolvedAt: string | null
}

export interface ApiRecommendation {
  productId: string
  productName: string
  liftScore: number
  promotionTag?: string
}

export interface ApiWarehouse {
  id: string
  name: string
  shippingCostPerUnit: number
  createdAt: string
  stockLevels: Array<{
    productId: string
    productName: string
    quantityAvailable: number
  }>
}

export interface ApiFulfillmentLine {
  quoteLineId: string
  productId: string
  productName: string
  quantityRequested: number
  allocations: Array<{ warehouseId: string; warehouseName: string; quantity: number }>
  backorderedQuantity: number
}

export interface ApiFulfillment {
  quoteId: string
  status?: QuoteStatus
  lines: ApiFulfillmentLine[]
}

export interface ApiLedgerEntry {
  id: string
  quoteId: string
  subscriptionId: string | null
  type: string
  amount: number
  description: string
  createdAt: string
  runningTotal: number
}

export interface ApiSubscription {
  id: string
  quoteId: string
  planId: string
  quantity: number
  cycleStartDate: string
  cycleEndDate: string
  status: string
  plan?: {
    id: string
    name: string
    billingCycleDays: number
    pricePerUnit: number
  }
}

export interface ApiAuditEvent {
  id: string
  aggregateId: string
  aggregateType: string
  type: string
  payload: unknown
  actorUserId: string | null
  createdAt: string
}

export interface ApiReplayResult {
  actual: { riskScore: number; routing: string[] }
  hypothetical: { riskScore: number; routing: string[] }
  changed: boolean
  linesUsedInReplay: Array<{
    lineId: string
    productId: string
    quantity: number
    discountPercent: number
    lineValue: number
    category: string
  }>
  replaySource?: 'events' | 'snapshot'
}

export interface ApiAnomaly {
  quoteId: string
  lineId: string
  discountPercent: number
  zScore: number
  repName: string
}

export interface ApiStalledQuote {
  quoteId: string
  currentStatus: QuoteStatus
  dwellDays: number
  threshold: number
  isStalled: boolean
}

export interface PortalQuoteView {
  id: string
  status: QuoteStatus
  blendedRiskScore: number | null
  customerName: string
  tier: string
  lines: Array<{
    id: string
    productId: string
    productName: string
    category: string
    quantity: number
    unitPrice: number
    discountPercent: number
    lineValue: number
  }>
}

export interface PortalAccessResponse {
  linkSentTo: string
  expiresAt: string
  quoteId: string
  emailSent: boolean
  message: string
  token?: string
  link?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pageCount: number
}

export interface ApiNotification {
  id: string
  quoteId: string | null
  message: string
  read: boolean
  time: string
}
