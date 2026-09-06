import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { RiskBadge } from '../../components/ui/Badge'
import { Table, Th, Td, Tr } from '../../components/ui/Table'
import { useApp } from '../../context/AppContext'
import { fetchQuotes } from '../../lib/quotes-api'
import { avgDiscount, riskLevelFromScore, shortQuoteId } from '../../lib/quote-utils'
import type { ApiQuote } from '../../lib/types'
import { PIPELINE_STAGES } from '../../data/mock'
import { formatCurrency, getIstGreeting, timeAgo } from '../../lib/utils'

const KPI = [
  { label: 'Pipeline Value', value: '₹4.28Cr', change: '+8.2%', up: true },
  { label: 'Pending Approvals', value: '4', change: '+2', up: false },
  { label: 'At-Risk Deals', value: '3', change: '-1', up: true },
  { label: 'Revenue This Month', value: '₹1.12Cr', change: '+12.4%', up: true },
  { label: 'Fulfillment Cost', value: '₹1,150', change: '-4.1%', up: true },
  { label: 'Subscription MRR', value: '₹1.9L', change: '+6.8%', up: true },
]

const RISK_DATA = [
  { name: 'Low', value: 12, color: '#2e7d32' },
  { name: 'Medium', value: 5, color: '#ed6c02' },
  { name: 'High', value: 3, color: '#c62828' },
]

const ACTIVITY = [
  { action: 'Quote created', deal: 'DF-1042', time: 'just now' },
  { action: 'Risk calculated', deal: 'DF-1042', time: '2 min ago' },
  { action: 'Approval requested', deal: 'DF-1042', time: '2 min ago' },
  { action: 'Manager approved', deal: 'DF-1042', time: '8 min ago' },
  { action: 'Warehouse allocated', deal: 'DF-1028', time: '12 min ago' },
  { action: 'Invoice generated', deal: 'DF-1035', time: '1 hr ago' },
]

export function OverviewPage() {
  const { user } = useApp()
  const [pending, setPending] = useState<ApiQuote[]>([])

  useEffect(() => {
    fetchQuotes({ status: 'PENDING_APPROVAL', limit: 5 })
      .then((r) => setPending(r.items))
      .catch(() => setPending([]))
  }, [])

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-semibold">{getIstGreeting()}, {user.name.split(' ')[0]}</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">Here's what's happening across your sales operations.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPI.map((k) => (
          <Card key={k.label} className="!p-4">
            <p className="text-xs text-[var(--color-muted)]">{k.label}</p>
            <p className="text-lg font-bold mt-1">{k.value}</p>
            <p className={`text-xs mt-1 ${k.up ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>{k.change}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales Pipeline" subtitle="Deals by stage" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={PIPELINE_STAGES}>
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" fill="#1565C0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Deal Risk Overview" />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={RISK_DATA} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={2}>
                {RISK_DATA.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs">
            {RISK_DATA.map((r) => (
              <span key={r.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                {r.name} ({r.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Approval Queue"
            action={<Link to="/app/approvals"><Button variant="ghost" size="sm">View all</Button></Link>}
          />
          <Table>
            <thead><tr><Th>Deal</Th><Th>Customer</Th><Th>Risk</Th><Th>Discount</Th><Th>Required</Th><Th>Age</Th></tr></thead>
            <tbody>
              {pending.map((d) => (
                <Tr key={d.id}>
                  <Td><Link to={`/app/deals/${d.id}`} className="text-[var(--color-brand)] font-medium">{shortQuoteId(d.id)}</Link></Td>
                  <Td>{d.customer?.name ?? '—'}</Td>
                  <Td><RiskBadge level={riskLevelFromScore(d.blendedRiskScore)} /></Td>
                  <Td>{avgDiscount(d.lines).toFixed(1)}%</Td>
                  <Td className="text-xs">{d.approvals.find((a) => a.decision === 'PENDING')?.approverRole ?? '—'}</Td>
                  <Td className="text-xs text-[var(--color-muted)]">{timeAgo(d.updatedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Fulfillment Status" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Stat label="Orders fulfilled" value="24" />
            <Stat label="Backorders" value="3" />
            <Stat label="Warehouse utilization" value="68%" />
            <Stat label="Avg fulfillment cost" value="₹385" />
          </div>
          <Link to="/app/fulfillment"><Button variant="secondary" size="sm">Open Fulfillment</Button></Link>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Activity" subtitle="Live event stream" />
        <div className="space-y-0">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-[var(--color-border)] last:border-0 text-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--color-brand)] shrink-0" />
              <span className="flex-1">{a.action} — <span className="font-medium">{a.deal}</span></span>
              <span className="text-xs text-[var(--color-muted)]">{a.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-[var(--color-table-header-bg)] rounded border border-[var(--color-border)]">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  )
}
