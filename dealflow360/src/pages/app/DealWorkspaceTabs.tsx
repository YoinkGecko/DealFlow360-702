import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, Th, Td, Tr } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { QuoteRiskPanel } from '../../components/business/QuoteRiskPanel'
import { ApiError } from '../../lib/api'
import {
  addQuoteLine,
  allocateFulfillment,
  attachSubscription,
  changeSubscriptionQuantity,
  fetchAuditEvents,
  fetchChangeRequests,
  fetchFulfillment,
  fetchLedger,
  fetchProducts,
  fetchRecommendations,
  replayQuote,
  respondChangeRequest,
  sendQuoteToPortal,
  submitQuote,
  updateQuoteLine,
} from '../../lib/quotes-api'
import { usePermission } from '../../hooks/usePermission'
import type { ApiAuditEvent, ApiChangeRequest, ApiProduct, ApiQuote, ApiRecommendation } from '../../lib/types'
import { avgDiscount, formatRiskPercent } from '../../lib/quote-utils'
import { formatCurrency, timeAgo } from '../../lib/utils'

// Re-export draft check
function quoteIsDraft(q: ApiQuote) {
  return q.status === 'DRAFT'
}

interface Props {
  activeTab: string
  quote: ApiQuote
  savingLine: string | null
  actionLoading: boolean
  onQuoteUpdated: () => void
  onSavingLine: (id: string | null) => void
  onActionLoading: (v: boolean) => void
  showToast: (msg: string) => void
}

export function DealWorkspaceTabs({
  activeTab,
  quote,
  savingLine,
  actionLoading,
  onQuoteUpdated,
  onSavingLine,
  onActionLoading,
  showToast,
}: Props) {
  if (activeTab === 'quote') {
    return (
      <QuoteTab
        quote={quote}
        savingLine={savingLine}
        actionLoading={actionLoading}
        onQuoteUpdated={onQuoteUpdated}
        onSavingLine={onSavingLine}
        onActionLoading={onActionLoading}
        showToast={showToast}
      />
    )
  }
  if (activeTab === 'fulfillment') {
    return <FulfillmentTab quoteId={quote.id} onQuoteUpdated={onQuoteUpdated} showToast={showToast} />
  }
  if (activeTab === 'billing') {
    return <BillingTab quoteId={quote.id} onQuoteUpdated={onQuoteUpdated} showToast={showToast} />
  }
  if (activeTab === 'audit') {
    return <AuditTab quoteId={quote.id} />
  }
  if (activeTab === 'what-if') {
    return <WhatIfTab quote={quote} showToast={showToast} />
  }
  if (activeTab === 'changes') {
    return (
      <ChangeRequestsTab
        quote={quote}
        onQuoteUpdated={onQuoteUpdated}
        showToast={showToast}
      />
    )
  }
  return null
}

function QuoteTab({
  quote,
  savingLine,
  actionLoading,
  onQuoteUpdated,
  onSavingLine,
  onActionLoading,
  showToast,
}: Omit<Props, 'activeTab'>) {
  const [showAdd, setShowAdd] = useState(false)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [recs, setRecs] = useState<ApiRecommendation[]>([])
  const [addForm, setAddForm] = useState({ productId: '', quantity: 1, discountPercent: 0 })
  const canAddLine = usePermission('quote.addLine')
  const canSubmitQuote = usePermission('quote.submit')
  const canSendQuote = usePermission('quote.sendToCustomer')
  const isDraft = quoteIsDraft(quote)
  const pendingApproval = quote.status === 'PENDING_APPROVAL'
  const canSubmit = isDraft && quote.lines.length > 0 && canSubmitQuote

  useEffect(() => {
    const productIds = [...new Set(quote.lines.map((l) => l.productId))]
    if (productIds.length === 0) {
      setRecs([])
      return
    }
    Promise.all(productIds.map((id) => fetchRecommendations(id).catch(() => ({ recommendations: [] }))))
      .then((results) => {
        const merged = new Map<string, ApiRecommendation>()
        for (const r of results) {
          for (const rec of r.recommendations) {
            if (!quote.lines.some((l) => l.productId === rec.productId)) {
              merged.set(rec.productId, rec)
            }
          }
        }
        setRecs([...merged.values()].slice(0, 6))
      })
      .catch(() => setRecs([]))
  }, [quote.lines])

  const openAdd = async () => {
    try {
      const list = await fetchProducts({ limit: 100 })
      setProducts(list.items)
      setAddForm({ productId: list.items[0]?.id ?? '', quantity: 1, discountPercent: 0 })
      setShowAdd(true)
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed to load products')
    }
  }

  const handleAddLine = async () => {
    onActionLoading(true)
    try {
      await addQuoteLine(quote.id, addForm)
      setShowAdd(false)
      showToast('Product added')
      onQuoteUpdated()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed to add line')
    } finally {
      onActionLoading(false)
    }
  }

  const handleSubmit = async () => {
    onActionLoading(true)
    try {
      await submitQuote(quote.id)
      showToast('Submitted for approval')
      onQuoteUpdated()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Submit failed')
    } finally {
      onActionLoading(false)
    }
  }

  const handleSend = async () => {
    const email = prompt('Customer email for portal link:', 'procurement@acmecorp.test')
    if (!email) return
    onActionLoading(true)
    try {
      const res = await sendQuoteToPortal(quote.id, email)
      showToast(res.message)
      if (!res.emailSent && res.link) {
        console.log('[portal] Magic link:', res.link)
      }
      onQuoteUpdated()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Send failed')
    } finally {
      onActionLoading(false)
    }
  }

  const addRecToQuote = async (rec: ApiRecommendation) => {
    onActionLoading(true)
    try {
      await addQuoteLine(quote.id, {
        productId: rec.productId,
        quantity: 1,
        discountPercent: 0,
      })
      showToast(`Added ${rec.productName}`)
      onQuoteUpdated()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed to add')
    } finally {
      onActionLoading(false)
    }
  }

  const lines = quote.lines
  const total = lines.reduce((s, l) => s + l.lineValue, 0)

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {isDraft && canAddLine && (
          <>
            <Button variant="secondary" size="sm" onClick={openAdd} disabled={actionLoading}>
              <Plus className="w-4 h-4" /> Add Product
            </Button>
            {canSubmit && (
              <Button size="sm" onClick={handleSubmit} disabled={actionLoading}>
                Submit for Approval
              </Button>
            )}
          </>
        )}
        {quote.status === 'APPROVED' && canSendQuote && (
          <Button size="sm" onClick={handleSend} disabled={actionLoading}>
            Send to Customer
          </Button>
        )}
        {isDraft && (
          <span className="text-xs text-[var(--color-muted)] self-center">
            Changes save automatically when you edit a line.
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--color-muted)] uppercase">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Unit</th>
                    <th className="text-right py-2">Disc %</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-t border-[var(--color-border)]">
                      <td className="py-2 font-medium">{line.product?.name ?? '—'}</td>
                      <td className="py-2 text-right">
                        {isDraft ? (
                          <input
                            type="number"
                            min={1}
                            defaultValue={line.quantity}
                            disabled={savingLine === line.id}
                            onBlur={async (e) => {
                              const val = Number(e.target.value)
                              if (val === line.quantity || val < 1) return
                              onSavingLine(line.id)
                              try {
                                await updateQuoteLine(quote.id, line.id, { quantity: val })
                                onQuoteUpdated()
                              } catch (err) {
                                showToast(err instanceof ApiError ? err.message : 'Update failed')
                              } finally {
                                onSavingLine(null)
                              }
                            }}
                            className="w-14 px-1 py-1 text-right border rounded text-sm"
                          />
                        ) : (
                          line.quantity
                        )}
                      </td>
                      <td className="py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="py-2 text-right">
                        {isDraft ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={line.discountPercent}
                            disabled={savingLine === line.id}
                            onBlur={async (e) => {
                              const val = Number(e.target.value)
                              if (val === line.discountPercent) return
                              onSavingLine(line.id)
                              try {
                                await updateQuoteLine(quote.id, line.id, { discountPercent: val })
                                onQuoteUpdated()
                              } catch (err) {
                                showToast(err instanceof ApiError ? err.message : 'Update failed')
                              } finally {
                                onSavingLine(null)
                              }
                            }}
                            className="w-14 px-1 py-1 text-right border rounded text-sm"
                          />
                        ) : (
                          `${line.discountPercent}%`
                        )}
                      </td>
                      <td className="py-2 text-right">{formatCurrency(line.lineValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lines.length === 0 && (
              <p className="text-sm text-[var(--color-muted)] py-4 text-center">No products on this quote yet.</p>
            )}
          </Card>

          {recs.length > 0 && (
            <Card>
              <CardHeader title="Recommendations" subtitle="Based on products in this quote" />
              <div className="grid sm:grid-cols-2 gap-3">
                {recs.map((r) => (
                  <div key={r.productId} className="p-3 border border-[var(--color-border)] rounded-md text-sm">
                    <p className="font-medium">{r.productName}</p>
                    <p className="text-[var(--color-muted)] text-xs mt-1">Lift: {r.liftScore}x</p>
                    {r.promotionTag && (
                      <span className="text-xs text-[var(--color-brand)]">{r.promotionTag}</span>
                    )}
                    {isDraft && canAddLine && (
                      <Button size="sm" className="mt-2" onClick={() => addRecToQuote(r)} disabled={actionLoading}>
                        Add to Quote
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold mb-3">Summary</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">Avg discount</span>
                <span>{avgDiscount(lines).toFixed(1)}%</span>
              </div>
            </div>
          </Card>
          <QuoteRiskPanel quote={quote} />
          {pendingApproval && (
            <Card>
              <p className="text-sm text-[var(--color-warning)]">Awaiting approval — check the Approvals screen.</p>
              <Link to="/app/approvals" className="text-sm text-[var(--color-brand)] mt-2 inline-block">
                Go to Approvals →
              </Link>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Product">
        <div className="space-y-3">
          <select
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={addForm.productId}
            onChange={(e) => setAddForm((f) => ({ ...f, productId: e.target.value }))}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.unitPrice))}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Quantity</label>
              <input
                type="number"
                min={1}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                value={addForm.quantity}
                onChange={(e) => setAddForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Discount %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                value={addForm.discountPercent}
                onChange={(e) => setAddForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddLine} disabled={actionLoading}>Add</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function FulfillmentTab({
  quoteId,
  onQuoteUpdated,
  showToast,
}: {
  quoteId: string
  onQuoteUpdated: () => void
  showToast: (m: string) => void
}) {
  const [fulfillment, setFulfillment] = useState<Awaited<ReturnType<typeof fetchFulfillment>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [allocating, setAllocating] = useState(false)
  const canAllocate = usePermission('fulfillment.allocate')

  const load = () => {
    setLoading(true)
    fetchFulfillment(quoteId)
      .then(setFulfillment)
      .catch(() => setFulfillment(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [quoteId])

  const allocate = async () => {
    setAllocating(true)
    try {
      await allocateFulfillment(quoteId)
      showToast('Allocation complete')
      load()
      onQuoteUpdated()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Allocation failed')
    } finally {
      setAllocating(false)
    }
  }

  if (loading) return <p className="text-sm text-[var(--color-muted)]">Loading fulfillment…</p>

  return (
    <Card>
      <CardHeader
        title="Fulfillment"
        action={
          canAllocate ? (
            <Button size="sm" onClick={allocate} disabled={allocating}>
              {allocating ? 'Allocating…' : 'Allocate'}
            </Button>
          ) : undefined
        }
      />
      {!fulfillment?.lines?.length ? (
        <p className="text-sm text-[var(--color-muted)]">No allocation yet. Quote must be APPROVED to allocate.</p>
      ) : (
        <div className="space-y-4">
          {fulfillment.lines.map((line) => (
            <div key={line.quoteLineId} className="border border-[var(--color-border)] rounded-md p-3 text-sm">
              <p className="font-medium">{line.productName} × {line.quantityRequested}</p>
              {line.allocations.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[var(--color-muted)]">
                  {line.allocations.map((a) => (
                    <li key={a.warehouseId}>{a.warehouseName}: {a.quantity} units</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--color-muted)] mt-1">No warehouse split yet</p>
              )}
              {line.backorderedQuantity > 0 && (
                <p className="text-[var(--color-danger)] mt-1">Backorder: {line.backorderedQuantity}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function BillingTab({
  quoteId,
  onQuoteUpdated,
  showToast,
}: {
  quoteId: string
  onQuoteUpdated: () => void
  showToast: (m: string) => void
}) {
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof fetchLedger>> | null>(null)
  const [planId, setPlanId] = useState('')
  const [quantity, setQuantity] = useState(2)
  const [subId, setSubId] = useState('')
  const [newQty, setNewQty] = useState(3)
  const [loading, setLoading] = useState(true)
  const canBill = usePermission('billing.manage')

  const load = () => {
    setLoading(true)
    fetchLedger(quoteId)
      .then(setLedger)
      .catch(() => setLedger(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [quoteId])

  const attach = async () => {
    if (!planId.trim()) {
      showToast('Enter subscription plan ID (from seed output)')
      return
    }
    try {
      const sub = await attachSubscription(quoteId, { planId: planId.trim(), quantity })
      setSubId(sub.id)
      showToast('Subscription attached')
      load()
      onQuoteUpdated()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Attach failed')
    }
  }

  const changeQty = async () => {
    if (!subId.trim()) {
      showToast('Enter subscription ID')
      return
    }
    try {
      await changeSubscriptionQuantity(quoteId, subId.trim(), newQty)
      showToast('Quantity updated — check ledger for proration')
      load()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Update failed')
    }
  }

  if (loading) return <p className="text-sm text-[var(--color-muted)]">Loading ledger…</p>

  return (
    <div className="space-y-4">
      {canBill && (
        <Card>
          <CardHeader title="Attach Subscription" />
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <input
              placeholder="Plan UUID (from seed)"
              className="px-3 py-2 border rounded-md"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="px-3 py-2 border rounded-md"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <Button size="sm" onClick={attach}>Attach</Button>
          </div>
          <div className="grid md:grid-cols-3 gap-3 text-sm mt-4 pt-4 border-t">
            <input
              placeholder="Subscription UUID"
              className="px-3 py-2 border rounded-md"
              value={subId}
              onChange={(e) => setSubId(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="px-3 py-2 border rounded-md"
              value={newQty}
              onChange={(e) => setNewQty(Number(e.target.value))}
            />
            <Button size="sm" variant="secondary" onClick={changeQty}>Apply Qty Change</Button>
          </div>
        </Card>
      )}
      {!canBill && (ledger?.entries ?? []).length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">No billing actions available for your role.</p>
      )}
      <Card padding={false}>
        <Table>
          <thead>
            <tr><Th>Type</Th><Th>Description</Th><Th>Amount</Th><Th>Running</Th><Th>Date</Th></tr>
          </thead>
          <tbody>
            {(ledger?.entries ?? []).length === 0 ? (
              <tr><Td colSpan={5} className="text-center py-6 text-[var(--color-muted)]">No ledger entries</Td></tr>
            ) : (
              ledger!.entries.map((e) => (
                <Tr key={e.id}>
                  <Td className="text-xs font-mono">{e.type}</Td>
                  <Td>{e.description}</Td>
                  <Td>{formatCurrency(e.amount)}</Td>
                  <Td>{formatCurrency(e.runningTotal)}</Td>
                  <Td className="text-xs">{timeAgo(e.createdAt)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {ledger && <p className="p-3 text-sm font-medium border-t">Total: {formatCurrency(ledger.total)}</p>}
      </Card>
    </div>
  )
}

function AuditTab({ quoteId }: { quoteId: string }) {
  const [events, setEvents] = useState<ApiAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetchAuditEvents(quoteId, page, 20)
      .then((r) => {
        setEvents(r.items)
        setPageCount(r.pageCount)
        setTotal(r.total)
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load audit'))
      .finally(() => setLoading(false))
  }, [quoteId, page])

  if (loading) return <p className="text-sm text-[var(--color-muted)]">Loading audit trail…</p>
  if (error) return <p className="text-sm text-[var(--color-danger)]">{error}</p>

  return (
    <Card padding={false}>
      <Table>
        <thead>
          <tr><Th>Time</Th><Th>Event</Th><Th>Details</Th></tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <Tr key={e.id}>
              <Td className="text-xs">{new Date(e.createdAt).toLocaleString()}</Td>
              <Td className="font-mono text-xs">{e.type}</Td>
              <Td className="text-xs text-[var(--color-muted)] max-w-md truncate">
                {JSON.stringify(e.payload)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <div className="px-4 pb-3">
        <Pagination page={page} pageCount={pageCount} total={total} onPageChange={setPage} />
      </div>
    </Card>
  )
}

function WhatIfTab({ quote, showToast }: { quote: ApiQuote; showToast: (m: string) => void }) {
  const customerTier = quote.customer?.tier.name ?? 'Gold'
  const lineCategories = [...new Set(quote.lines.map((l) => l.product?.category).filter(Boolean))] as string[]
  const defaultCategory = lineCategories[0] ?? 'Service'

  const [ceiling, setCeiling] = useState(18)
  const [tier, setTier] = useState(customerTier)
  const [category, setCategory] = useState(defaultCategory)
  const [result, setResult] = useState<Awaited<ReturnType<typeof replayQuote>> | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (quote.lines.length === 0) {
      showToast('Add at least one line item before running replay')
      return
    }
    if (tier !== customerTier) {
      showToast(`Ceiling tier must match customer tier (${customerTier}) to apply an override`)
      return
    }
    setLoading(true)
    try {
      const r = await replayQuote(quote.id, [
        { category, customerTier: tier, ceilingPercent: ceiling },
      ])
      setResult(r)
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Replay failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="What-if Replay"
          subtitle="Compare actual risk/routing vs a hypothetical discount ceiling (from event log or current quote lines)"
        />
        {quote.lines.length === 0 && (
          <p className="text-sm text-[var(--color-warning)] mb-3">
            No line items on this quote yet — add products on the Quote tab first.
          </p>
        )}
        <div className="grid md:grid-cols-3 gap-3 mb-2">
          <div>
            <label className="text-xs text-[var(--color-muted)]">Customer tier</label>
            <input
              className="w-full px-3 py-2 border rounded text-sm mt-1"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              placeholder="Tier"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-muted)]">Product category</label>
            <input
              className="w-full px-3 py-2 border rounded text-sm mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              list="what-if-categories"
            />
            <datalist id="what-if-categories">
              {lineCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-[var(--color-muted)]">Hypothetical ceiling %</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded text-sm mt-1"
              value={ceiling}
              onChange={(e) => setCeiling(Number(e.target.value))}
            />
          </div>
        </div>
        <p className="text-xs text-[var(--color-muted)] mb-4">
          Customer is <strong>{customerTier}</strong> tier
          {lineCategories.length > 0 && <> · categories on quote: {lineCategories.join(', ')}</>}.
          Override only applies when tier matches the customer.
        </p>
        <Button size="sm" onClick={run} disabled={loading || quote.lines.length === 0}>
          {loading ? 'Running…' : 'Replay Decision'}
        </Button>
      </Card>
      {result && (
        <div className="space-y-3">
          {result.replaySource === 'snapshot' && (
            <p className="text-xs text-[var(--color-muted)] bg-[var(--color-warning-bg)] border border-[var(--color-warning)] rounded px-3 py-2">
              No audit events for this quote — replay used current line items (common for seed data).
            </p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <p className="text-xs text-[var(--color-muted)] uppercase">Actual</p>
              <p className="text-2xl font-bold">{formatRiskPercent(result.actual.riskScore)}</p>
              <p className="text-sm mt-2">{result.actual.routing.join(' → ') || 'Auto-approved'}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--color-muted)] uppercase">Hypothetical</p>
              <p className="text-2xl font-bold">{formatRiskPercent(result.hypothetical.riskScore)}</p>
              <p className="text-sm mt-2">{result.hypothetical.routing.join(' → ') || 'Auto-approved'}</p>
              {result.changed && (
                <p className="text-xs text-[var(--color-warning)] mt-2">Routing or risk would change under this ceiling</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function ChangeRequestsTab({
  quote,
  onQuoteUpdated,
  showToast,
}: {
  quote: ApiQuote
  onQuoteUpdated: () => void
  showToast: (m: string) => void
}) {
  const [requests, setRequests] = useState<ApiChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const canRespond = usePermission('changeRequest.respond')

  const load = () => {
    fetchChangeRequests(quote.id)
      .then((r) => setRequests(r.changeRequests))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [quote.id])

  const respond = async (reqId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    try {
      await respondChangeRequest(quote.id, reqId, { decision })
      showToast(decision === 'ACCEPTED' ? 'Accepted' : 'Rejected')
      load()
      onQuoteUpdated()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed')
    }
  }

  if (loading) return <p className="text-sm text-[var(--color-muted)]">Loading change requests…</p>

  return (
    <Card padding={false}>
      <Table>
        <thead>
          <tr><Th>Type</Th><Th>Message</Th><Th>Proposed %</Th><Th>Status</Th><Th></Th></tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><Td colSpan={5} className="text-center py-6 text-[var(--color-muted)]">No change requests</Td></tr>
          ) : (
            requests.map((r) => (
              <Tr key={r.id}>
                <Td>{r.type}</Td>
                <Td>{r.message ?? '—'}</Td>
                <Td>{r.proposedDiscountPercent ?? '—'}</Td>
                <Td>{r.status}</Td>
                <Td>
                  {r.status === 'PENDING' && canRespond ? (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => respond(r.id, 'ACCEPTED')}>Accept</Button>
                      <Button size="sm" variant="secondary" onClick={() => respond(r.id, 'REJECTED')}>Reject</Button>
                    </div>
                  ) : null}
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
    </Card>
  )
}
