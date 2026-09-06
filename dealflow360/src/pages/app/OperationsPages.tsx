import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, Th, Td, Tr } from '../../components/ui/Table'
import { Pagination } from '../../components/ui/Pagination'
import { ApiError } from '../../lib/api'
import { fetchAnomalies, fetchStalledQuotes, fetchWarehouses } from '../../lib/quotes-api'
import { shortQuoteId } from '../../lib/quote-utils'
import type { ApiAnomaly, ApiStalledQuote, ApiWarehouse } from '../../lib/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'

export function FulfillmentPage() {
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWarehouses()
      .then((r) => setWarehouses(r.warehouses))
      .catch(() => setWarehouses([]))
      .finally(() => setLoading(false))
  }, [])

  const totalStock = warehouses.reduce(
    (sum, w) => sum + w.stockLevels.reduce((s, sl) => s + sl.quantityAvailable, 0),
    0,
  )

  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Fulfillment</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Warehouse inventory overview. Allocate stock from an approved deal&apos;s workspace (Fulfillment tab).
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Warehouses', value: String(warehouses.length) },
          { label: 'SKUs in stock', value: String(warehouses.reduce((s, w) => s + w.stockLevels.length, 0)) },
          { label: 'Total units available', value: String(totalStock) },
          { label: 'Avg ship cost/unit', value: warehouses.length ? `₹${Math.round(warehouses.reduce((s, w) => s + w.shippingCostPerUnit, 0) / warehouses.length)}` : '—' },
        ].map((s) => (
          <Card key={s.label} className="!p-4">
            <p className="text-xs text-[var(--color-muted)]">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading warehouses…</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => {
            const units = w.stockLevels.reduce((s, sl) => s + sl.quantityAvailable, 0)
            const skus = w.stockLevels.length
            const util = skus > 0 ? Math.min(100, Math.round((units / (skus * 100)) * 100)) : 0
            return (
              <Card key={w.id}>
                <h3 className="font-semibold text-sm">{w.name}</h3>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--color-muted)]">SKUs</span><span>{skus}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-muted)]">Available units</span><span>{units}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-muted)]">Ship cost/unit</span><span>₹{w.shippingCostPerUnit}</span></div>
                </div>
                <div className="mt-2 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-brand)] rounded-full" style={{ width: `${util}%` }} />
                </div>
                {w.stockLevels.length > 0 && (
                  <ul className="mt-3 text-xs text-[var(--color-muted)] space-y-1 max-h-24 overflow-y-auto">
                    {w.stockLevels.map((sl) => (
                      <li key={sl.productId}>{sl.productName}: {sl.quantityAvailable}</li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Allocate inventory" subtitle="Open a deal workspace to run the allocator" />
        <Link to="/app/deals"><Button size="sm">Go to Deals</Button></Link>
      </Card>
    </div>
  )
}

export function BillingPage() {
  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Billing</h1>
      <Card>
        <p className="text-sm text-[var(--color-muted)]">
          Billing and ledger entries are scoped to individual deals. Open a deal and use the Billing tab to attach subscriptions and view the ledger.
        </p>
        <Link to="/app/deals" className="inline-block mt-4">
          <Button size="sm">Browse Deals</Button>
        </Link>
      </Card>
    </div>
  )
}

export function SubscriptionsPage() {
  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Subscriptions</h1>
      <Card>
        <p className="text-sm text-[var(--color-muted)]">
          Subscriptions are attached per quote. Open a deal workspace → Billing tab to attach a plan or change quantity.
        </p>
        <Link to="/app/deals" className="inline-block mt-4">
          <Button size="sm">Browse Deals</Button>
        </Link>
      </Card>
    </div>
  )
}

export function RecommendationsPage() {
  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Recommendations Engine</h1>
      <Card>
        <p className="text-sm text-[var(--color-muted)]">
          Product recommendations appear in each deal workspace (Quote tab) based on items in the quote.
        </p>
        <Link to="/app/deals" className="inline-block mt-4">
          <Button size="sm">Browse Deals</Button>
        </Link>
      </Card>
    </div>
  )
}

export function DealHealthPage() {
  const [anomalies, setAnomalies] = useState<ApiAnomaly[]>([])
  const [stalled, setStalled] = useState<ApiStalledQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [anomalyPage, setAnomalyPage] = useState(1)
  const [stalledPage, setStalledPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    Promise.all([fetchAnomalies(), fetchStalledQuotes()])
      .then(([a, s]) => {
        setAnomalies(a.anomalies)
        setStalled(s.quotes.filter((q) => q.isStalled))
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load deal health'))
      .finally(() => setLoading(false))
  }, [])

  const anomalySlice = useMemo(() => {
    const start = (anomalyPage - 1) * pageSize
    return anomalies.slice(start, start + pageSize)
  }, [anomalies, anomalyPage])

  const stalledSlice = useMemo(() => {
    const start = (stalledPage - 1) * pageSize
    return stalled.slice(start, start + pageSize)
  }, [stalled, stalledPage])

  const anomalyPageCount = Math.max(1, Math.ceil(anomalies.length / pageSize))
  const stalledPageCount = Math.max(1, Math.ceil(stalled.length / pageSize))

  if (loading) return <p className="text-sm text-[var(--color-muted)]">Loading deal health…</p>
  if (error) return <p className="text-sm text-[var(--color-danger)]">{error}</p>

  return (
    <div className="space-y-6 animate-in">
      <h1 className="text-xl font-semibold">Deal Health</h1>

      <Card>
        <CardHeader title="Discount Anomalies" subtitle="Deviations from rep historical behavior (z-score)" />
        <Table>
          <thead><tr><Th>Rep</Th><Th>Deal</Th><Th>Discount</Th><Th>Z-Score</Th><Th>Status</Th></tr></thead>
          <tbody>
            {anomalies.length === 0 ? (
              <tr><Td colSpan={5} className="text-center py-6 text-[var(--color-muted)]">No anomalies detected</Td></tr>
            ) : (
              anomalySlice.map((a) => (
                <Tr key={`${a.quoteId}-${a.lineId}`}>
                  <Td>{a.repName}</Td>
                  <Td><Link to={`/app/deals/${a.quoteId}`} className="text-[var(--color-brand)]">{shortQuoteId(a.quoteId)}</Link></Td>
                  <Td className={a.zScore >= 2 ? 'text-[var(--color-danger)] font-medium' : ''}>{a.discountPercent}%</Td>
                  <Td>{a.zScore.toFixed(1)}</Td>
                  <Td>
                    <span className={`text-xs font-medium ${a.zScore >= 2 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                      {a.zScore >= 2 ? 'Anomaly Detected' : 'Normal'}
                    </span>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {anomalies.length > pageSize && (
          <div className="px-4 pb-3">
            <Pagination
              page={anomalyPage}
              pageCount={anomalyPageCount}
              total={anomalies.length}
              onPageChange={setAnomalyPage}
            />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Stalled Deals" />
        <Table>
          <thead><tr><Th>Deal</Th><Th>Stage</Th><Th>Days In Stage</Th><Th>Threshold</Th><Th>Status</Th><Th>Action</Th></tr></thead>
          <tbody>
            {stalled.length === 0 ? (
              <tr><Td colSpan={6} className="text-center py-6 text-[var(--color-muted)]">No stalled deals</Td></tr>
            ) : (
              stalledSlice.map((q) => (
                <Tr key={q.quoteId}>
                  <Td><Link to={`/app/deals/${q.quoteId}`} className="text-[var(--color-brand)]">{shortQuoteId(q.quoteId)}</Link></Td>
                  <Td>{q.currentStatus.replace(/_/g, ' ')}</Td>
                  <Td className="text-[var(--color-danger)]">{q.dwellDays}</Td>
                  <Td>{q.threshold} days</Td>
                  <Td><span className="text-xs text-[var(--color-warning)]">Stalled</span></Td>
                  <Td>
                    <Button variant="ghost" size="sm" disabled title="Coming soon">
                      Nudge Rep (soon)
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {stalled.length > pageSize && (
          <div className="px-4 pb-3">
            <Pagination
              page={stalledPage}
              pageCount={stalledPageCount}
              total={stalled.length}
              onPageChange={setStalledPage}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

const REVENUE_DATA = [
  { month: 'Oct', revenue: 82 }, { month: 'Nov', revenue: 95 }, { month: 'Dec', revenue: 88 },
  { month: 'Jan', revenue: 102 }, { month: 'Feb', revenue: 112 }, { month: 'Mar', revenue: 118 },
]

export function AnalyticsPage() {
  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex gap-2">
          {['Date', 'Sales Rep', 'Tier', 'Category'].map((f) => (
            <select key={f} className="text-xs border border-[var(--color-border)] rounded px-2 py-1.5 bg-[var(--color-surface)]">
              <option>{f}</option>
            </select>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Revenue by Month" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={REVENUE_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#1565C0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader title="Approval Rates" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Auto', rate: 62 }, { name: 'Manager', rate: 28 }, { name: 'Finance', rate: 10 },
            ]}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Bar dataKey="rate" fill="#1565C0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Avg Discount', value: '11.2%' },
          { label: 'Margin Trend', value: '+2.1%' },
          { label: 'Fulfillment Cost', value: '₹385' },
          { label: 'Conversion Rate', value: '34%' },
        ].map((k) => (
          <Card key={k.label} className="!p-4 text-center">
            <p className="text-xs text-[var(--color-muted)]">{k.label}</p>
            <p className="text-xl font-bold mt-1">{k.value}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
