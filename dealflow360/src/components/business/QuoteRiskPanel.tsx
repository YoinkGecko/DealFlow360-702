import { formatRiskPercent, riskLevelFromScore } from '../../lib/quote-utils'
import type { ApiApproval, ApiQuote } from '../../lib/types'
import { Badge, RiskBadge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Cpu } from 'lucide-react'

export function QuoteRiskPanel({ quote }: { quote: ApiQuote }) {
  const level = riskLevelFromScore(quote.blendedRiskScore)
  const pendingApprovals = quote.approvals.filter((a) => a.decision === 'PENDING')

  return (
    <Card className="border-[#1565C0]/30 bg-[#fafbfc]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-md bg-[#e3f2fd] flex items-center justify-center">
          <Cpu className="w-4 h-4 text-[#1565C0]" />
        </div>
        <div>
          <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">Business Decision</p>
          <p className="text-sm font-semibold">Server Risk Score</p>
        </div>
        <Badge variant="purple" className="ml-auto">System</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-[#6b7280] mb-1">Blended Risk</p>
          <p className="text-3xl font-bold text-[#1a1d21]">
            {formatRiskPercent(quote.blendedRiskScore)}
          </p>
        </div>
        <div className="flex flex-col items-end justify-center">
          <RiskBadge level={level} />
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-t border-[#e8eaed]">
          <span className="text-[#6b7280]">Quote status</span>
          <span className="font-semibold">{quote.status.replace(/_/g, ' ')}</span>
        </div>
        {pendingApprovals.length > 0 && (
          <div>
            <p className="text-xs text-[#6b7280] mb-2">Pending approvals</p>
            <div className="flex flex-wrap gap-1">
              {pendingApprovals.map((a) => (
                <span
                  key={a.id}
                  className="px-2 py-1 rounded text-xs font-medium bg-[#fff4e5] text-[#ed6c02]"
                >
                  {a.approverRole}
                </span>
              ))}
            </div>
          </div>
        )}
        {quote.approvals.some((a) => a.decision !== 'PENDING') && (
          <div className="text-xs space-y-1 border-t border-[#e8eaed] pt-2">
            {quote.approvals
              .filter((a) => a.decision !== 'PENDING')
              .map((a) => (
                <p key={a.id} className="text-[#6b7280]">
                  {a.approverRole}: {a.decision}
                  {a.reason ? ` — ${a.reason}` : ''}
                </p>
              ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export function ApprovalSummary({ approvals }: { approvals: ApiApproval[] }) {
  const pending = approvals.filter((a) => a.decision === 'PENDING')
  if (pending.length === 0) return <p className="text-sm text-[#6b7280]">No pending approvals</p>
  return (
    <div className="text-sm space-y-1">
      {pending.map((a) => (
        <p key={a.id}>
          <span className="font-medium">{a.approverRole}</span> — pending
        </p>
      ))}
    </div>
  )
}
