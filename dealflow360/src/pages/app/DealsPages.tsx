import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { RiskBadge, StageBadge } from '../../components/ui/Badge'
import { Table, Th, Td, Tr } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { LifecycleStepper } from '../../components/business/BusinessDecisionPanel'
import { DealWorkspaceTabs } from './DealWorkspaceTabs'
import { useApp } from '../../context/AppContext'
import { ApiError } from '../../lib/api'
import { avgDiscount, riskLevelFromScore, shortQuoteId, stageIndexFromStatus, STATUS_TABS, formatQuoteStatus, quoteTotal } from '../../lib/quote-utils'
import { createQuote, fetchChangeRequests, fetchCustomers, fetchQuote, fetchQuotes } from '../../lib/quotes-api'
import type { ApiCustomer, ApiQuote } from '../../lib/types'
import { canCreateQuote } from '../../lib/roles'
import { Can } from '../../components/ui/Can'
import { Pagination } from '../../components/ui/Pagination'
import { formatCurrency, timeAgo } from '../../lib/utils'

export function DealsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, showToast } = useApp()
  const [tab, setTab] = useState('all')
  const [quotes, setQuotes] = useState<ApiQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [creating, setCreating] = useState(false)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const q = searchParams.get('search')
    if (q) setSearch(q)
  }, [searchParams])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tabDef = STATUS_TABS.find((t) => t.key === tab)
      const data = await fetchQuotes({
        status: tabDef?.status,
        page,
        limit: 20,
        search: search.trim() || undefined,
      })
      setQuotes(data.items)
      setPageCount(data.pageCount)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [tab, page, search])

  useEffect(() => {
    setPage(1)
  }, [tab, search])

  useEffect(() => {
    load()
  }, [load])

  const openNewDeal = async () => {
    try {
      const list = await fetchCustomers({ limit: 100 })
      setCustomers(list.items)
      setSelectedCustomer(list.items[0]?.id ?? '')
      setShowNew(true)
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed to load customers')
    }
  }

  const handleCreate = async () => {
    if (!selectedCustomer) return
    setCreating(true)
    try {
      const quote = await createQuote(selectedCustomer)
      setShowNew(false)
      showToast('Deal created')
      navigate(`/app/deals/${quote.id}`)
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed to create deal')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Deals</h1>
        {canCreateQuote(user.role) && (
          <Can action="quote.create">
            <Button size="sm" onClick={openNewDeal}>
              <Plus className="w-4 h-4" /> New Deal
            </Button>
          </Can>
        )}
      </div>

      <input
        type="search"
        placeholder="Search by customer name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]"
      />

      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              tab === t.key ? 'bg-[var(--color-brand)] text-[var(--color-on-brand)]' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]'
            }`}
          >
            {t.key === 'all' ? 'All' : formatQuoteStatus(t.status!)}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] border border-[var(--color-danger)] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading deals…</p>
      ) : (
        <Card padding={false}>
          <Table>
            <thead>
              <tr>
                <Th>Deal</Th><Th>Customer</Th><Th>Amount</Th><Th>Discount</Th>
                <Th>Risk</Th><Th>Stage</Th><Th>Updated</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <Td colSpan={8} className="text-center text-[var(--color-muted)] py-8">
                    No deals found
                  </Td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <Tr key={q.id}>
                    <Td>
                      <Link to={`/app/deals/${q.id}`} className="text-[var(--color-brand)] font-medium">
                        {shortQuoteId(q.id)}
                      </Link>
                    </Td>
                    <Td>{q.customer?.name ?? '—'}</Td>
                    <Td>{formatCurrency(quoteTotal(q.lines))}</Td>
                    <Td>{avgDiscount(q.lines).toFixed(1)}%</Td>
                    <Td><RiskBadge level={riskLevelFromScore(q.blendedRiskScore)} /></Td>
                    <Td><StageBadge stage={q.status} /></Td>
                    <Td className="text-xs text-[var(--color-muted)]">{timeAgo(q.updatedAt)}</Td>
                    <Td>
                      <Link to={`/app/deals/${q.id}`}>
                        <Button variant="ghost" size="sm">Open</Button>
                      </Link>
                    </Td>
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

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Deal">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Customer</label>
            <select
              className="mt-1 w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.tier.name})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !selectedCustomer}>
              {creating ? 'Creating…' : 'Create Deal'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const WORKSPACE_TABS = ['quote', 'fulfillment', 'billing', 'audit', 'what-if', 'changes'] as const

const WORKSPACE_TAB_LABELS: Record<typeof WORKSPACE_TABS[number], string> = {
  quote: 'Quote',
  fulfillment: 'Fulfillment',
  billing: 'Billing',
  audit: 'Audit',
  'what-if': 'What-if',
  changes: 'Change Requests',
}

export function DealWorkspacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useApp()
  const [quote, setQuote] = useState<ApiQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingLine, setSavingLine] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pendingChangeCount, setPendingChangeCount] = useState(0)

  const activeTab = (searchParams.get('tab') as typeof WORKSPACE_TABS[number]) || 'quote'

  const loadPendingChanges = useCallback(async (quoteId: string) => {
    try {
      const { changeRequests } = await fetchChangeRequests(quoteId)
      setPendingChangeCount(changeRequests.filter((r) => r.status === 'PENDING').length)
    } catch {
      setPendingChangeCount(0)
    }
  }, [])

  const loadQuote = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchQuote(id)
      setQuote(data)
      await loadPendingChanges(data.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load deal')
      setQuote(null)
      setPendingChangeCount(0)
    } finally {
      setLoading(false)
    }
  }, [id, loadPendingChanges])

  useEffect(() => {
    loadQuote()
  }, [loadQuote])

  const setTab = (tab: string) => {
    setSearchParams(tab === 'quote' ? {} : { tab })
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading deal…</p>
  }

  if (error || !quote) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-danger)]">{error || 'Deal not found'}</p>
        <Button variant="secondary" onClick={() => navigate('/app/deals')}>Back to Deals</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/app/deals')} className="text-xs text-[var(--color-brand)] mb-1">
            ← Back to Deals
          </button>
          <h1 className="text-xl font-semibold">Deal {shortQuoteId(quote.id)}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {quote.customer?.name ?? 'Customer'} · <StageBadge stage={quote.status} />
          </p>
        </div>
      </div>

      <LifecycleStepper current={stageIndexFromStatus(quote.status)} />

      <div className="flex gap-1 flex-wrap border-b border-[var(--color-border)] pb-1">
        {WORKSPACE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium capitalize rounded-t ${
              activeTab === t
                ? 'bg-[var(--color-surface)] border border-[var(--color-border)] border-b-[var(--color-surface)] -mb-px text-[var(--color-brand)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {WORKSPACE_TAB_LABELS[t]}
              {t === 'changes' && pendingChangeCount > 0 && (
                <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[var(--color-danger)] text-[var(--color-on-brand)] text-[10px] font-semibold flex items-center justify-center">
                  {pendingChangeCount}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <DealWorkspaceTabs
        activeTab={activeTab}
        quote={quote}
        savingLine={savingLine}
        actionLoading={actionLoading}
        pendingChangeCount={pendingChangeCount}
        onGoToChanges={() => setTab('changes')}
        onQuoteUpdated={loadQuote}
        onSavingLine={setSavingLine}
        onActionLoading={setActionLoading}
        showToast={showToast}
      />
    </div>
  )
}
