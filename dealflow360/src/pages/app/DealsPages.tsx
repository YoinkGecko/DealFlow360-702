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
import { createQuote, fetchCustomers, fetchQuote, fetchQuotes } from '../../lib/quotes-api'
import type { ApiCustomer, ApiQuote } from '../../lib/types'
import { canCreateQuote } from '../../lib/roles'
import { formatCurrency, timeAgo } from '../../lib/utils'

export function DealsPage() {
  const navigate = useNavigate()
  const { user, showToast } = useApp()
  const [tab, setTab] = useState('all')
  const [quotes, setQuotes] = useState<ApiQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tabDef = STATUS_TABS.find((t) => t.key === tab)
      const data = await fetchQuotes(tabDef?.status)
      setQuotes(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const openNewDeal = async () => {
    try {
      const list = await fetchCustomers()
      setCustomers(list)
      setSelectedCustomer(list[0]?.id ?? '')
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
          <Button size="sm" onClick={openNewDeal}>
            <Plus className="w-4 h-4" /> New Deal
          </Button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              tab === t.key ? 'bg-[#1565C0] text-white' : 'bg-white border border-[#e8eaed] text-[#6b7280]'
            }`}
          >
            {t.key === 'all' ? 'All' : formatQuoteStatus(t.status!)}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-[#c62828] bg-[#ffebee] border border-[#ffcdd2] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#6b7280]">Loading deals…</p>
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
                  <Td colSpan={8} className="text-center text-[#6b7280] py-8">
                    No deals found
                  </Td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <Tr key={q.id}>
                    <Td>
                      <Link to={`/app/deals/${q.id}`} className="text-[#1565C0] font-medium">
                        {shortQuoteId(q.id)}
                      </Link>
                    </Td>
                    <Td>{q.customer?.name ?? '—'}</Td>
                    <Td>{formatCurrency(quoteTotal(q.lines))}</Td>
                    <Td>{avgDiscount(q.lines).toFixed(1)}%</Td>
                    <Td><RiskBadge level={riskLevelFromScore(q.blendedRiskScore)} /></Td>
                    <Td><StageBadge stage={q.status} /></Td>
                    <Td className="text-xs text-[#6b7280]">{timeAgo(q.updatedAt)}</Td>
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
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Deal">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Customer</label>
            <select
              className="mt-1 w-full px-3 py-2 border border-[#e8eaed] rounded-md text-sm"
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

export function DealWorkspacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, showToast } = useApp()
  const [quote, setQuote] = useState<ApiQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingLine, setSavingLine] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const activeTab = (searchParams.get('tab') as typeof WORKSPACE_TABS[number]) || 'quote'

  const loadQuote = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchQuote(id)
      setQuote(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load deal')
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadQuote()
  }, [loadQuote])

  const setTab = (tab: string) => {
    setSearchParams(tab === 'quote' ? {} : { tab })
  }

  if (loading) {
    return <p className="text-sm text-[#6b7280]">Loading deal…</p>
  }

  if (error || !quote) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[#c62828]">{error || 'Deal not found'}</p>
        <Button variant="secondary" onClick={() => navigate('/app/deals')}>Back to Deals</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/app/deals')} className="text-xs text-[#1565C0] mb-1">
            ← Back to Deals
          </button>
          <h1 className="text-xl font-semibold">Deal {shortQuoteId(quote.id)}</h1>
          <p className="text-sm text-[#6b7280]">
            {quote.customer?.name ?? 'Customer'} · <StageBadge stage={quote.status} />
          </p>
        </div>
      </div>

      <LifecycleStepper current={stageIndexFromStatus(quote.status)} />

      <div className="flex gap-1 flex-wrap border-b border-[#e8eaed] pb-1">
        {WORKSPACE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium capitalize rounded-t ${
              activeTab === t
                ? 'bg-white border border-[#e8eaed] border-b-white -mb-px text-[#1565C0]'
                : 'text-[#6b7280]'
            }`}
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      <DealWorkspaceTabs
        activeTab={activeTab}
        quote={quote}
        user={user}
        savingLine={savingLine}
        actionLoading={actionLoading}
        onQuoteUpdated={loadQuote}
        onSavingLine={setSavingLine}
        onActionLoading={setActionLoading}
        showToast={showToast}
      />
    </div>
  )
}
