import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { RiskBadge } from '../../components/ui/Badge'
import { Table, Th, Td, Tr } from '../../components/ui/Table'
import { Drawer } from '../../components/ui/Modal'
import { QuoteRiskPanel } from '../../components/business/QuoteRiskPanel'
import { useApp } from '../../context/AppContext'
import { ApiError } from '../../lib/api'
import {
  decideApproval,
  fetchChangeRequests,
  fetchCustomers,
  fetchQuotes,
  respondChangeRequest,
} from '../../lib/quotes-api'
import {
  approvalRoleMatchesUser,
  canDecideApprovals,
  canRespondToChangeRequests,
} from '../../lib/roles'
import {
  avgDiscount,
  quoteTotal,
  riskLevelFromScore,
  shortQuoteId,
} from '../../lib/quote-utils'
import { Pagination } from '../../components/ui/Pagination'
import { Can } from '../../components/ui/Can'
import { fetchProducts } from '../../lib/quotes-api'
import type { ApiApproval, ApiChangeRequest, ApiCustomer, ApiProduct, ApiQuote } from '../../lib/types'
import { DEFAULT_POLICY } from '../../lib/risk'
import { formatCurrency, timeAgo } from '../../lib/utils'

const FILTERS = ['My Approvals', 'All Pending', 'High Risk'] as const

function pendingApprovalForUser(quote: ApiQuote, userRole: string): ApiApproval | undefined {
  return quote.approvals.find(
    (a) => a.decision === 'PENDING' && approvalRoleMatchesUser(a.approverRole, userRole as import('../../data/mock').UserRole),
  )
}

export function ApprovalsPage() {
  const { user, showToast } = useApp()
  const [filter, setFilter] = useState<typeof FILTERS[number]>('My Approvals')
  const [quotes, setQuotes] = useState<ApiQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [changeRequests, setChangeRequests] = useState<ApiChangeRequest[]>([])
  const [crLoading, setCrLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchQuotes({ status: 'PENDING_APPROVAL', page, limit: 10 })
      setQuotes(data.items)
      setPageCount(data.pageCount)
      setTotal(data.total)
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed to load approvals')
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }, [showToast, page])

  useEffect(() => {
    load()
  }, [load])

  const queue = quotes.filter((q) => {
    if (filter === 'High Risk') {
      return riskLevelFromScore(q.blendedRiskScore) === 'high'
    }
    if (filter === 'My Approvals') {
      return !!pendingApprovalForUser(q, user.role)
    }
    return true
  })

  const deal = quotes.find((d) => d.id === selected)
  const myApproval = deal ? pendingApprovalForUser(deal, user.role) : undefined
  const canDecide = canDecideApprovals(user.role) && !!myApproval
  const canRespondCr = canRespondToChangeRequests(user.role)

  useEffect(() => {
    if (!selected) {
      setChangeRequests([])
      return
    }
    setCrLoading(true)
    fetchChangeRequests(selected)
      .then((r) => setChangeRequests(r.changeRequests))
      .catch(() => setChangeRequests([]))
      .finally(() => setCrLoading(false))
  }, [selected])

  const decide = async (decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED') => {
    if (!deal || !myApproval) return
    if (!reason.trim()) {
      showToast('Reason is required')
      return
    }
    setDeciding(true)
    try {
      await decideApproval(deal.id, myApproval.id, { decision, reason: reason.trim() })
      showToast(decision === 'APPROVED' ? 'Approved' : decision === 'REJECTED' ? 'Rejected' : 'Revision requested')
      setSelected(null)
      setReason('')
      load()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Decision failed')
    } finally {
      setDeciding(false)
    }
  }

  const respondCr = async (reqId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    if (!deal) return
    try {
      await respondChangeRequest(deal.id, reqId, { decision })
      showToast(decision === 'ACCEPTED' ? 'Change request accepted' : 'Change request rejected')
      const r = await fetchChangeRequests(deal.id)
      setChangeRequests(r.changeRequests)
      load()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed to respond')
    }
  }

  const pendingCrs = changeRequests.filter((r) => r.status === 'PENDING')

  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Approvals</h1>

      <div className="flex gap-1 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              filter === f ? 'bg-[var(--color-brand)] text-[var(--color-on-brand)]' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading approval queue…</p>
      ) : (
        <Card padding={false}>
          <Table>
            <thead>
              <tr>
                <Th>Deal</Th><Th>Customer</Th><Th>Value</Th><Th>Risk</Th><Th>Discount</Th>
                <Th>Pending Role</Th><Th>Updated</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr><Td colSpan={8} className="text-center py-8 text-[var(--color-muted)]">No quotes pending approval</Td></tr>
              ) : (
                queue.map((d) => {
                  const next = d.approvals.find((a) => a.decision === 'PENDING')
                  return (
                    <Tr key={d.id}>
                      <Td onClick={() => { setSelected(d.id); setReason('') }}>
                        <span className="text-[var(--color-brand)] font-medium cursor-pointer">{shortQuoteId(d.id)}</span>
                      </Td>
                      <Td>{d.customer?.name ?? '—'}</Td>
                      <Td>{formatCurrency(quoteTotal(d.lines))}</Td>
                      <Td><RiskBadge level={riskLevelFromScore(d.blendedRiskScore)} /></Td>
                      <Td>{avgDiscount(d.lines).toFixed(1)}%</Td>
                      <Td className="text-xs">{next?.approverRole ?? '—'}</Td>
                      <Td className="text-xs text-[var(--color-muted)]">{timeAgo(d.updatedAt)}</Td>
                      <Td><span className="text-xs text-[var(--color-warning)]">Pending</span></Td>
                    </Tr>
                  )
                })
              )}
            </tbody>
          </Table>
          {pageCount > 1 && (
            <div className="px-4 pb-3">
              <Pagination page={page} pageCount={pageCount} total={total} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}

      <Drawer
        open={!!selected && !!deal}
        onClose={() => { setSelected(null); setReason('') }}
        title={`Approval: ${deal ? shortQuoteId(deal.id) : ''}`}
        footer={
          deal && canDecide ? (
            <>
              <Button
                variant="secondary"
                disabled={deciding || !reason.trim()}
                onClick={() => decide('REJECTED')}
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                disabled={deciding || !reason.trim()}
                onClick={() => decide('REVISION_REQUESTED')}
              >
                Request Changes
              </Button>
              <Button disabled={deciding || !reason.trim()} onClick={() => decide('APPROVED')}>
                Approve
              </Button>
            </>
          ) : undefined
        }
      >
        {deal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[var(--color-muted)] text-xs">Customer</p><p className="font-medium">{deal.customer?.name}</p></div>
              <div><p className="text-[var(--color-muted)] text-xs">Tier</p><p className="font-medium">{deal.customer?.tier.name}</p></div>
              <div><p className="text-[var(--color-muted)] text-xs">Value</p><p className="font-medium">{formatCurrency(quoteTotal(deal.lines))}</p></div>
              <div><p className="text-[var(--color-muted)] text-xs">Avg discount</p><p className="font-medium">{avgDiscount(deal.lines).toFixed(1)}%</p></div>
            </div>
            <QuoteRiskPanel quote={deal} />
            <div>
              <p className="text-xs font-medium text-[var(--color-muted)] mb-2">Approval trail</p>
              <div className="text-xs space-y-2 border-l-2 border-[var(--color-border)] pl-3">
                {deal.approvals.map((a) => (
                  <p key={a.id}>
                    {a.approverRole}: {a.decision}
                    {a.reason ? ` — ${a.reason}` : ''}
                    {a.decidedAt ? ` (${timeAgo(a.decidedAt)})` : ''}
                  </p>
                ))}
              </div>
            </div>
            {canDecide && (
              <div>
                <label className="text-sm font-medium">Reason (required)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
                  placeholder="Explain your decision…"
                />
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-[var(--color-muted)] mb-2">Pending change requests</p>
              {crLoading ? (
                <p className="text-sm text-[var(--color-muted)]">Loading…</p>
              ) : pendingCrs.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">None</p>
              ) : (
                <div className="space-y-2">
                  {pendingCrs.map((r) => (
                    <div key={r.id} className="p-3 border border-[var(--color-border)] rounded-md text-sm">
                      <p className="font-medium">{r.type}</p>
                      <p className="text-[var(--color-muted)]">{r.message ?? '—'}</p>
                      {r.proposedDiscountPercent != null && (
                        <p className="text-xs mt-1">Proposed discount: {r.proposedDiscountPercent}%</p>
                      )}
                      {canRespondCr ? (
                        <div className="flex gap-2 mt-2">
                          <Can action="changeRequest.respond">
                            <Button size="sm" onClick={() => respondCr(r.id, 'ACCEPTED')}>Accept</Button>
                            <Button size="sm" variant="secondary" onClick={() => respondCr(r.id, 'REJECTED')}>Reject</Button>
                          </Can>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link to={`/app/deals/${deal.id}`} className="text-sm text-[var(--color-brand)]">Open full deal workspace →</Link>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export function CustomersPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    setLoading(true)
    fetchCustomers({ page, limit: 20, search: search.trim() || undefined })
      .then((r) => {
        setCustomers(r.items)
        setPageCount(r.pageCount)
        setTotal(r.total)
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false))
  }, [page, search])

  const customer = customers.find((c) => c.id === selected)

  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Customers</h1>
      <input
        type="search"
        placeholder="Search customers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"
      />
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading customers…</p>
      ) : (
        <Card padding={false}>
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th><Th>Tier</Th><Th>Email</Th><Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><Td colSpan={4} className="text-center py-8 text-[var(--color-muted)]">No customers</Td></tr>
              ) : (
                customers.map((c) => (
                  <Tr key={c.id}>
                    <Td onClick={() => setSelected(c.id)}><span className="font-medium cursor-pointer">{c.name}</span></Td>
                    <Td><span className="px-2 py-0.5 bg-[var(--color-warning-bg)] text-[var(--color-warning)] rounded text-xs font-medium">{c.tier.name}</span></Td>
                    <Td className="text-[var(--color-muted)]">{c.email}</Td>
                    <Td className="text-xs text-[var(--color-muted)]">{new Date(c.createdAt).toLocaleDateString()}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
          <div className="px-4 pb-3">
            <Pagination page={page} pageCount={pageCount} total={total} onPageChange={setPage} />
          </div>
        </Card>
      )}

      <Drawer open={!!customer} onClose={() => setSelected(null)} title={customer?.name ?? ''}>
        {customer && (
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-[var(--color-warning-bg)] rounded border border-[var(--color-warning)]">
              <p className="text-xs text-[var(--color-muted)]">Customer Tier</p>
              <p className="text-lg font-bold text-[var(--color-warning)]">{customer.tier.name}</p>
            </div>
            <p><span className="text-[var(--color-muted)]">Email:</span> {customer.email}</p>
            <Link to="/app/deals" className="text-[var(--color-brand)]">View deals →</Link>
          </div>
        )}
      </Drawer>
    </div>
  )
}


export function ProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    setLoading(true)
    fetchProducts({ page, limit: 20, search: search.trim() || undefined })
      .then((r) => {
        setProducts(r.items)
        setPageCount(r.pageCount)
        setTotal(r.total)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [page, search])

  return (
    <div className="space-y-4 animate-in">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Products</h1>
        <Can action="product.create">
          <Button size="sm" disabled title="Use Admin API or seed for new products">
            + New Product
          </Button>
        </Can>
      </div>
      <input
        type="search"
        placeholder="Search products…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"
      />
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading products…</p>
      ) : (
        <Card padding={false}>
          <Table>
            <thead>
              <tr>
                <Th>Product</Th><Th>Category</Th><Th>Price</Th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><Td colSpan={3} className="text-center py-8 text-[var(--color-muted)]">No products</Td></tr>
              ) : (
                products.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-medium">{p.name}</Td>
                    <Td>{p.category}</Td>
                    <Td>{formatCurrency(Number(p.unitPrice))}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
          <div className="px-4 pb-3">
            <Pagination page={page} pageCount={pageCount} total={total} onPageChange={setPage} />
          </div>
        </Card>
      )}
    </div>
  )
}

export function PoliciesPage() {
  const { showToast } = useApp()
  const [policy] = useState(() => ({ ...DEFAULT_POLICY }))
  const [managerThreshold, setManagerThreshold] = useState(policy.managerThreshold * 100)
  const [financeThreshold, setFinanceThreshold] = useState(policy.financeThreshold * 100)

  const save = () => {
    showToast('Policy display updated locally (backend policy API not wired)')
  }

  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Pricing & Policies</h1>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm">Policy Engine Status</h3>
            <p className="text-xs text-[var(--color-muted)]">Read-only view of default policy configuration.</p>
          </div>
          <span className="px-3 py-1 bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-full text-xs font-semibold">ACTIVE</span>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Discount Ceilings — Customer Tier × Product Category</h3>
        <Table>
          <thead><tr><Th>Customer Tier</Th><Th>Product Category</Th><Th>Maximum Discount</Th></tr></thead>
          <tbody>
            {policy.ceilings.slice(0, 8).map((c, i) => (
              <Tr key={i}>
                <Td>{c.tier}</Td>
                <Td>{c.category}</Td>
                <Td>{c.maxDiscount}%</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Approval Thresholds</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Manager Threshold (%)</label>
            <input
              type="number"
              value={managerThreshold}
              onChange={(e) => setManagerThreshold(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
            />
            <p className="text-xs text-[var(--color-muted)] mt-1">Blended risk above this routes to Sales Manager</p>
          </div>
          <div>
            <label className="text-sm font-medium">Finance Threshold (%)</label>
            <input
              type="number"
              value={financeThreshold}
              onChange={(e) => setFinanceThreshold(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
            />
            <p className="text-xs text-[var(--color-muted)] mt-1">Above this requires Manager + Finance</p>
          </div>
        </div>
        <Can action="policy.manage">
          <Button className="mt-4" onClick={save}>Save Configuration</Button>
        </Can>
      </Card>
    </div>
  )
}
