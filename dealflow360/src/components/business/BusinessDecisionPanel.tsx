import { cn } from '../../lib/utils'
import type { RiskResult } from '../../lib/risk'
import { formatPercent } from '../../lib/utils'
import { Badge, RiskBadge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Cpu } from 'lucide-react'

export function BusinessDecisionPanel({ risk }: { risk: RiskResult }) {
  const overLines = risk.breakdown.filter((b) => b.status === 'over')

  return (
    <Card className="border-[#1565C0]/30 bg-[#fafbfc]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-md bg-[#e3f2fd] flex items-center justify-center">
          <Cpu className="w-4 h-4 text-[#1565C0]" />
        </div>
        <div>
          <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">Business Decision</p>
          <p className="text-sm font-semibold">Automated Policy Evaluation</p>
        </div>
        <Badge variant="purple" className="ml-auto">System</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-[#6b7280] mb-1">Discount Risk</p>
          <p className="text-3xl font-bold text-[#1a1d21]">{formatPercent(risk.blendedRisk)}</p>
        </div>
        <div className="flex flex-col items-end justify-center">
          <RiskBadge level={risk.level === 'none' ? 'low' : risk.level} />
        </div>
      </div>

      {overLines.length > 0 && (
        <div className="mb-4 p-3 bg-white rounded-md border border-[#e8eaed]">
          <p className="text-xs font-medium text-[#6b7280] mb-2">Why this was flagged</p>
          <p className="text-sm text-[#1a1d21] mb-3">
            {overLines.length} product categor{overLines.length > 1 ? 'ies' : 'y'} exceed configured discount ceilings.
          </p>
          <div className="space-y-2">
            {overLines.map((line) => (
              <div key={line.productName} className="flex justify-between text-sm border-t border-[#e8eaed] pt-2 first:border-0 first:pt-0">
                <span className="font-medium">{line.category}</span>
                <span className="text-[#6b7280]">
                  Given {line.given}% · Allowed {line.allowed}% ·{' '}
                  <span className="text-[#c62828] font-medium">+{line.overagePct.toFixed(1)}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-t border-[#e8eaed]">
          <span className="text-[#6b7280]">Order-level weighted risk</span>
          <span className="font-semibold">{formatPercent(risk.blendedRisk)}</span>
        </div>
        <div className="p-3 rounded-md bg-white border border-[#e8eaed]">
          <p className="text-xs text-[#6b7280]">Decision</p>
          <p className="font-medium mt-0.5">{risk.decision}</p>
        </div>
        {risk.approvalChain.length > 0 && (
          <div>
            <p className="text-xs text-[#6b7280] mb-2">Next steps</p>
            <div className="flex items-center gap-1 flex-wrap">
              {risk.approvalChain.map((step, i) => (
                <span key={step} className="flex items-center gap-1">
                  <span className={cn('px-2 py-1 rounded text-xs font-medium bg-[#e3f2fd] text-[#1565C0]')}>
                    {step}
                  </span>
                  {i < risk.approvalChain.length - 1 && (
                    <span className="text-[#6b7280]">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export function ExplainBlock({
  what,
  why,
  rule,
  next,
}: {
  what: string
  why: string
  rule: string
  next: string
}) {
  return (
    <div className="text-sm space-y-2 p-3 bg-[#fafbfc] rounded-md border border-[#e8eaed]">
      <Row label="What" value={what} />
      <Row label="Why" value={why} />
      <Row label="Rule" value={rule} />
      <Row label="Next" value={next} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[#6b7280] w-12 shrink-0 font-medium">{label}</span>
      <span className="text-[#1a1d21]">{value}</span>
    </div>
  )
}

export function LifecycleStepper({ current }: { current: number }) {
  const steps = ['Draft', 'Risk Review', 'Approval', 'Fulfillment', 'Billing', 'Paid']
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center shrink-0">
          <div
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium border',
              i < current && 'bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]',
              i === current && 'bg-[#1565C0] text-white border-[#1565C0]',
              i > current && 'bg-white text-[#6b7280] border-[#e8eaed]',
            )}
          >
            {step}
          </div>
          {i < steps.length - 1 && (
            <span className="mx-1 text-[#c5c9d0]">→</span>
          )}
        </div>
      ))}
    </div>
  )
}
