import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { StageBadge } from '../../components/ui/Badge'
import { ApiError } from '../../lib/api'
import {
  confirmPortalQuote,
  fetchPortalChangeRequests,
  fetchPortalQuote,
  submitPortalChangeRequest,
} from '../../lib/portal-api'
import { formatRiskPercent, quoteTotal, riskLevelFromScore } from '../../lib/quote-utils'
import type { ApiChangeRequest, PortalQuoteView } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'

export function PortalQuotePage() {
  const { token } = useParams<{ token: string }>()
  const [quote, setQuote] = useState<PortalQuoteView | null>(null)
  const [changeRequests, setChangeRequests] = useState<ApiChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [proposedDiscount, setProposedDiscount] = useState('')
  const [requestType, setRequestType] = useState<'COMMENT' | 'COUNTER_DISCOUNT'>('COMMENT')
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [q, cr] = await Promise.all([
        fetchPortalQuote(token),
        fetchPortalChangeRequests(token),
      ])
      setQuote(q)
      setChangeRequests(cr.changeRequests)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unable to load quotation')
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  const pendingCount = changeRequests.filter((r) => r.status === 'PENDING').length
  const canConfirm =
    quote &&
    (quote.status === 'APPROVED' || quote.status === 'SENT') &&
    pendingCount === 0

  const submitChangeRequest = async () => {
    if (!token) return
    setSubmitting(true)
    setStatusMsg('')
    try {
      await submitPortalChangeRequest(token, {
        type: requestType,
        message: message.trim() || undefined,
        proposedDiscountPercent:
          requestType === 'COUNTER_DISCOUNT' && proposedDiscount
            ? Number(proposedDiscount)
            : undefined,
      })
      setMessage('')
      setProposedDiscount('')
      setStatusMsg('Change request submitted.')
      const cr = await fetchPortalChangeRequests(token)
      setChangeRequests(cr.changeRequests)
    } catch (e) {
      setStatusMsg(e instanceof ApiError ? e.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const confirm = async () => {
    if (!token) return
    setConfirming(true)
    setStatusMsg('')
    try {
      const result = await confirmPortalQuote(token)
      setStatusMsg(`Quotation confirmed. Status: ${result.status}`)
      await load()
    } catch (e) {
      setStatusMsg(e instanceof ApiError ? e.message : 'Confirmation failed')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center text-sm text-[#6b7280]">
        Loading your quotation…
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#e8eaed] rounded-lg p-6 text-center">
          <p className="text-[#c62828] font-medium">{error || 'Quotation not found'}</p>
          <p className="text-sm text-[#6b7280] mt-2">This link may have expired. Contact your sales representative.</p>
        </div>
      </div>
    )
  }

  const total = quoteTotal(quote.lines)
  const riskLevel = riskLevelFromScore(quote.blendedRiskScore)

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-white border-b border-[#e8eaed] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1565C0] flex items-center justify-center text-white text-xs font-bold">DF</div>
          <div>
            <p className="font-semibold text-sm">DealFlow360 Customer Portal</p>
            <p className="text-xs text-[#6b7280]">Quotation for {quote.customerName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white border border-[#e8eaed] rounded-lg p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-semibold">Your Quotation</h1>
              <p className="text-sm text-[#6b7280]">{quote.customerName} · {quote.tier} tier</p>
            </div>
            <StageBadge stage={quote.status} />
          </div>

          <div className="flex items-center gap-4 p-3 bg-[#fafbfc] rounded-md text-sm mb-4">
            <span className="text-[#6b7280]">Risk indicator:</span>
            <span className={`font-medium ${
              riskLevel === 'high' ? 'text-[#c62828]' : riskLevel === 'medium' ? 'text-[#ed6c02]' : 'text-[#2e7d32]'
            }`}>
              {formatRiskPercent(quote.blendedRiskScore)}
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#6b7280] uppercase border-b border-[#e8eaed]">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit</th>
                <th className="text-right py-2">Disc %</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((line) => (
                <tr key={line.id} className="border-b border-[#e8eaed]">
                  <td className="py-2 font-medium">{line.productName}</td>
                  <td className="py-2 text-right">{line.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                  <td className="py-2 text-right">{line.discountPercent}%</td>
                  <td className="py-2 text-right">{formatCurrency(line.lineValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right font-semibold mt-3">Total: {formatCurrency(total)}</p>
        </div>

        {quote.status !== 'CONFIRMED' && (
          <div className="bg-white border border-[#e8eaed] rounded-lg p-6 space-y-4">
            <h2 className="font-semibold">Request a change</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRequestType('COMMENT')}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  requestType === 'COMMENT' ? 'bg-[#1565C0] text-white border-[#1565C0]' : 'border-[#e8eaed]'
                }`}
              >
                Comment
              </button>
              <button
                type="button"
                onClick={() => setRequestType('COUNTER_DISCOUNT')}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  requestType === 'COUNTER_DISCOUNT' ? 'bg-[#1565C0] text-white border-[#1565C0]' : 'border-[#e8eaed]'
                }`}
              >
                Counter discount
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Your message to the sales team…"
              className="w-full px-3 py-2 border border-[#e8eaed] rounded-md text-sm"
            />
            {requestType === 'COUNTER_DISCOUNT' && (
              <input
                type="number"
                min={0}
                max={100}
                value={proposedDiscount}
                onChange={(e) => setProposedDiscount(e.target.value)}
                placeholder="Proposed discount %"
                className="w-full px-3 py-2 border border-[#e8eaed] rounded-md text-sm"
              />
            )}
            <Button onClick={submitChangeRequest} disabled={submitting || !message.trim()}>
              {submitting ? 'Submitting…' : 'Submit change request'}
            </Button>
            {pendingCount > 0 && (
              <p className="text-xs text-[#ed6c02]">
                You have {pendingCount} pending change request(s). Confirmation is disabled until they are resolved.
              </p>
            )}
          </div>
        )}

        {changeRequests.length > 0 && (
          <div className="bg-white border border-[#e8eaed] rounded-lg p-6">
            <h2 className="font-semibold mb-3">Your change requests</h2>
            <ul className="space-y-2 text-sm">
              {changeRequests.map((r) => (
                <li key={r.id} className="p-3 bg-[#fafbfc] rounded border border-[#e8eaed]">
                  <span className="font-medium">{r.type}</span> — {r.status}
                  {r.message && <p className="text-[#6b7280] mt-1">{r.message}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {quote.status !== 'CONFIRMED' && (
          <div className="bg-white border border-[#e8eaed] rounded-lg p-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Confirm quotation</h2>
              <p className="text-sm text-[#6b7280]">Accept the terms as presented.</p>
            </div>
            <Button onClick={confirm} disabled={!canConfirm || confirming}>
              {confirming ? 'Confirming…' : 'Confirm Quotation'}
            </Button>
          </div>
        )}

        {statusMsg && (
          <p className="text-sm text-center text-[#1565C0]">{statusMsg}</p>
        )}
      </main>
    </div>
  )
}
