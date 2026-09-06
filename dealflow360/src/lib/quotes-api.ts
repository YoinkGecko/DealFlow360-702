import { apiFetch } from './api-client'
import type {
  ApiAnomaly,
  ApiAuditEvent,
  ApiChangeRequest,
  ApiCustomer,
  ApiFulfillment,
  ApiProduct,
  ApiQuote,
  ApiRecommendation,
  ApiReplayResult,
  ApiStalledQuote,
  ApiSubscription,
  ApiWarehouse,
  ApiNotification,
  PortalAccessResponse,
  QuoteStatus,
  PaginatedResponse,
} from './types'

function queryString(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export function fetchQuotes(params?: {
  status?: QuoteStatus
  page?: number
  limit?: number
  search?: string
}) {
  return apiFetch<PaginatedResponse<ApiQuote>>(
    `/quotes${queryString({
      status: params?.status,
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
    })}`,
  )
}

export function fetchQuote(id: string) {
  return apiFetch<ApiQuote>(`/quotes/${id}`)
}

export function createQuote(customerId: string) {
  return apiFetch<ApiQuote>('/quotes', {
    method: 'POST',
    body: JSON.stringify({ customerId }),
  })
}

export function addQuoteLine(
  quoteId: string,
  body: { productId: string; quantity: number; discountPercent: number },
) {
  return apiFetch<{ line: ApiQuote['lines'][0]; blendedRiskScore: number | null }>(
    `/quotes/${quoteId}/lines`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export function updateQuoteLine(
  quoteId: string,
  lineId: string,
  body: { quantity?: number; discountPercent?: number },
) {
  return apiFetch<{ line: ApiQuote['lines'][0]; blendedRiskScore: number | null }>(
    `/quotes/${quoteId}/lines/${lineId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export function submitQuote(quoteId: string) {
  return apiFetch<{ quote: ApiQuote; autoApproved: boolean }>(`/quotes/${quoteId}/submit`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function sendQuoteToCustomer(quoteId: string, customerEmail: string) {
  return apiFetch<PortalAccessResponse>('/portal/request-access', {
    method: 'POST',
    body: JSON.stringify({ quoteId, customerEmail }),
  })
}

export function decideApproval(
  quoteId: string,
  approvalId: string,
  body: { decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'; reason: string },
) {
  return apiFetch<{ approval: ApiQuote['approvals'][0]; quoteStatus: QuoteStatus }>(
    `/quotes/${quoteId}/approvals/${approvalId}/decide`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export function fetchChangeRequests(quoteId: string) {
  return apiFetch<{ changeRequests: ApiChangeRequest[] }>(`/quotes/${quoteId}/change-requests`)
}

export function respondChangeRequest(
  quoteId: string,
  reqId: string,
  body: { decision: 'ACCEPTED' | 'REJECTED'; note?: string },
) {
  return apiFetch<{
    changeRequestId: string
    status: string
    quoteStatus: QuoteStatus
    blendedRiskScore?: number | null
    reenteredApproval?: boolean
  }>(`/quotes/${quoteId}/change-requests/${reqId}/respond`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchCustomers(params?: { page?: number; limit?: number; search?: string }) {
  return apiFetch<PaginatedResponse<ApiCustomer>>(
    `/customers${queryString({ page: params?.page, limit: params?.limit, search: params?.search })}`,
  )
}

export function fetchProducts(params?: { page?: number; limit?: number; search?: string }) {
  return apiFetch<PaginatedResponse<ApiProduct>>(
    `/products${queryString({ page: params?.page, limit: params?.limit, search: params?.search })}`,
  )
}

export function createProduct(body: {
  name: string
  category: string
  unitPrice: number
  description?: string
}) {
  return apiFetch<ApiProduct>('/products', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchRecommendations(productId: string) {
  return apiFetch<{ productId: string; recommendations: ApiRecommendation[] }>(
    `/products/${productId}/recommendations`,
  )
}

export function fetchWarehouses() {
  return apiFetch<{ warehouses: ApiWarehouse[] }>('/warehouses')
}

export function allocateFulfillment(quoteId: string) {
  return apiFetch<ApiFulfillment>(`/quotes/${quoteId}/fulfillment/allocate`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function fetchFulfillment(quoteId: string) {
  return apiFetch<ApiFulfillment>(`/quotes/${quoteId}/fulfillment`)
}

export function attachSubscription(quoteId: string, body: { planId: string; quantity: number }) {
  return apiFetch<ApiSubscription>(`/quotes/${quoteId}/subscriptions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function changeSubscriptionQuantity(
  quoteId: string,
  subId: string,
  newQuantity: number,
) {
  return apiFetch<{
    subscription: ApiSubscription
    proratedAmount: number
    ledgerType: string
  }>(`/quotes/${quoteId}/subscriptions/${subId}`, {
    method: 'PATCH',
    body: JSON.stringify({ newQuantity }),
  })
}

export function fetchLedger(quoteId: string) {
  return apiFetch<{
    quoteId: string
    entries: Array<{
      id: string
      type: string
      amount: number
      description: string
      createdAt: string
      runningTotal: number
    }>
    total: number
  }>(`/quotes/${quoteId}/ledger`)
}

export function fetchAuditEvents(quoteId: string, page = 1, limit = 20) {
  return apiFetch<PaginatedResponse<ApiAuditEvent> & { aggregateId: string }>(
    `/audit/quotes/${quoteId}${queryString({ page, limit })}`,
  )
}

export function replayQuote(
  quoteId: string,
  hypotheticalCeilings?: Array<{
    category: string
    customerTier: string
    ceilingPercent: number
  }>,
) {
  return apiFetch<ApiReplayResult>(`/audit/quotes/${quoteId}/replay`, {
    method: 'POST',
    body: JSON.stringify({ hypotheticalCeilings }),
  })
}

export function fetchAnomalies() {
  return apiFetch<{ anomalies: ApiAnomaly[] }>('/deal-health/anomalies')
}

export function fetchStalledQuotes() {
  return apiFetch<{ quotes: ApiStalledQuote[] }>('/deal-health/stalled')
}

export function sendQuoteToPortal(quoteId: string, customerEmail: string) {
  return sendQuoteToCustomer(quoteId, customerEmail)
}

export function fetchNotifications() {
  return apiFetch<{ notifications: ApiNotification[] }>('/notifications')
}

export function markNotificationReadApi(id: string) {
  return apiFetch<{ ok: true }>(`/notifications/${id}/read`, { method: 'PATCH' })
}
