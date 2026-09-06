export type RiskLevel = 'low' | 'medium' | 'high' | 'none'
export type CustomerTier = 'Gold' | 'Silver' | 'Bronze'
export type ProductCategory = 'Software' | 'Services' | 'Hardware' | 'Subscription'

export interface DiscountCeiling {
  tier: CustomerTier
  category: ProductCategory
  maxDiscount: number
}

export interface QuoteLine {
  id: string
  productId: string
  productName: string
  category: ProductCategory
  quantity: number
  unitPrice: number
  discount: number
  cost: number
}

export interface LineRiskBreakdown {
  productName: string
  category: ProductCategory
  given: number
  allowed: number
  overagePct: number
  lineValue: number
  status: 'ok' | 'over'
}

export interface RiskResult {
  blendedRisk: number
  level: RiskLevel
  breakdown: LineRiskBreakdown[]
  decision: string
  approvalChain: string[]
  autoApproved: boolean
}

export interface PolicyConfig {
  ceilings: DiscountCeiling[]
  managerThreshold: number
  financeThreshold: number
}

export const DEFAULT_POLICY: PolicyConfig = {
  managerThreshold: 0.15,
  financeThreshold: 0.35,
  ceilings: [
    { tier: 'Gold', category: 'Software', maxDiscount: 12 },
    { tier: 'Gold', category: 'Services', maxDiscount: 10 },
    { tier: 'Gold', category: 'Hardware', maxDiscount: 15 },
    { tier: 'Gold', category: 'Subscription', maxDiscount: 8 },
    { tier: 'Silver', category: 'Software', maxDiscount: 10 },
    { tier: 'Silver', category: 'Services', maxDiscount: 8 },
    { tier: 'Silver', category: 'Hardware', maxDiscount: 12 },
    { tier: 'Silver', category: 'Subscription', maxDiscount: 6 },
    { tier: 'Bronze', category: 'Software', maxDiscount: 8 },
    { tier: 'Bronze', category: 'Services', maxDiscount: 6 },
    { tier: 'Bronze', category: 'Hardware', maxDiscount: 10 },
    { tier: 'Bronze', category: 'Subscription', maxDiscount: 5 },
  ],
}

export function getCeiling(
  policy: PolicyConfig,
  tier: CustomerTier,
  category: ProductCategory,
): number {
  return (
    policy.ceilings.find((c) => c.tier === tier && c.category === category)?.maxDiscount ?? 5
  )
}

export function calculateRisk(
  lines: QuoteLine[],
  tier: CustomerTier,
  policy: PolicyConfig,
): RiskResult {
  if (lines.length === 0) {
    return {
      blendedRisk: 0,
      level: 'none',
      breakdown: [],
      decision: 'Add products to evaluate risk',
      approvalChain: [],
      autoApproved: true,
    }
  }

  const breakdown: LineRiskBreakdown[] = lines.map((line) => {
    const allowed = getCeiling(policy, tier, line.category)
    const overage = Math.max(0, (line.discount - allowed) / allowed)
    const lineValue = line.unitPrice * line.quantity * (1 - line.discount / 100)
    return {
      productName: line.productName,
      category: line.category,
      given: line.discount,
      allowed,
      overagePct: overage * 100,
      lineValue,
      status: line.discount > allowed ? 'over' : 'ok',
    }
  })

  const totalValue = breakdown.reduce((s, b) => s + b.lineValue, 0) || 1
  const blendedRisk =
    breakdown.reduce((s, b) => {
      const lineOverage = Math.max(0, (b.given - b.allowed) / b.allowed)
      return s + lineOverage * (b.lineValue / totalValue)
    }, 0) * 100

  let level: RiskLevel = 'low'
  let decision = 'Auto-approved — within policy limits'
  let approvalChain: string[] = []
  let autoApproved = true

  if (blendedRisk <= 0.01) {
    level = 'none'
  } else if (blendedRisk <= policy.managerThreshold * 100) {
    level = 'medium'
    decision = 'Sales Manager approval required'
    approvalChain = ['Sales Manager']
    autoApproved = false
  } else {
    level = 'high'
    decision = 'Manager + Finance approval required'
    approvalChain = ['Sales Manager', 'Finance']
    autoApproved = false
  }

  if (blendedRisk > 0.01 && blendedRisk <= policy.managerThreshold * 100) {
    // medium already set
  }

  const overCount = breakdown.filter((b) => b.status === 'over').length
  if (overCount > 0 && blendedRisk <= policy.managerThreshold * 100 && blendedRisk > 0) {
    decision = `Sales Manager approval required — ${overCount} line(s) exceed category ceiling`
    approvalChain = ['Sales Manager']
    autoApproved = false
    level = blendedRisk > 8 ? 'medium' : 'low'
  }

  if (blendedRisk > policy.financeThreshold * 100) {
    level = 'high'
    decision = 'Manager + Finance approval required'
    approvalChain = ['Sales Manager', 'Finance']
    autoApproved = false
  } else if (blendedRisk > policy.managerThreshold * 100) {
    level = 'high'
    decision = 'Manager + Finance approval required'
    approvalChain = ['Sales Manager', 'Finance']
    autoApproved = false
  } else if (blendedRisk > 0.01) {
    level = blendedRisk > 8 ? 'medium' : 'low'
    decision = 'Sales Manager approval required'
    approvalChain = ['Sales Manager']
    autoApproved = false
  }

  return {
    blendedRisk: Math.round(blendedRisk * 10) / 10,
    level,
    breakdown,
    decision,
    approvalChain,
    autoApproved,
  }
}

export function calculateProration(
  unitPrice: number,
  deltaSeats: number,
  daysRemaining: number,
  totalDays: number,
) {
  return Math.round(unitPrice * deltaSeats * (daysRemaining / totalDays))
}
