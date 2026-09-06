import { API_BASE_URL, ApiError } from './api-client'
import type { ApiChangeRequest, PortalQuoteView } from './types'

/** Portal client — token from URL only, never uses internal JWT. */
export async function portalFetch<T>(
  _token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(body?.error ?? res.statusText, res.status)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

export function fetchPortalQuote(token: string) {
  return portalFetch<PortalQuoteView>(token, `/portal/quotes/${token}`)
}

export function fetchPortalChangeRequests(token: string) {
  return portalFetch<{ changeRequests: ApiChangeRequest[] }>(
    token,
    `/portal/quotes/${token}/change-requests`,
  )
}

export function submitPortalChangeRequest(
  token: string,
  body: {
    quoteLineId?: string
    type: 'COMMENT' | 'COUNTER_DISCOUNT' | 'GENERAL_CHANGE'
    proposedDiscountPercent?: number
    message?: string
  },
) {
  return portalFetch<ApiChangeRequest>(token, `/portal/quotes/${token}/change-requests`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function confirmPortalQuote(token: string) {
  return portalFetch<{ quoteId: string; status: string }>(
    token,
    `/portal/quotes/${token}/confirm`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}
