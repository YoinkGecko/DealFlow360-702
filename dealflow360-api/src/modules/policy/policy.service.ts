import { prisma } from '../../db/client.js'
import { computeBlendedRisk } from './risk-score.js'

export async function getAllCeilings() {
  return prisma.categoryDiscountCeiling.findMany({
    orderBy: [{ customerTier: 'asc' }, { category: 'asc' }],
  })
}

export async function upsertCeiling(data: {
  category: string
  customerTier: string
  ceilingPercent: number
}) {
  return prisma.categoryDiscountCeiling.upsert({
    where: {
      category_customerTier: {
        category: data.category,
        customerTier: data.customerTier,
      },
    },
    create: data,
    update: { ceilingPercent: data.ceilingPercent },
  })
}

export async function getAllApprovalChainRules() {
  return prisma.approvalChainRule.findMany({
    orderBy: { minRiskScore: 'asc' },
  })
}

export async function createApprovalChainRule(data: {
  minRiskScore: number
  maxRiskScore: number
  requiredApprovers: string[]
}) {
  return prisma.approvalChainRule.create({ data })
}

export async function loadPolicyConfig() {
  const [ceilings, tierDefaults, approvalRules] = await Promise.all([
    prisma.categoryDiscountCeiling.findMany(),
    prisma.customerTier.findMany(),
    prisma.approvalChainRule.findMany({ orderBy: { minRiskScore: 'asc' } }),
  ])
  return {
    ceilings,
    tierDefaults: tierDefaults.map((t) => ({
      name: t.name,
      defaultDiscountCeiling: t.defaultDiscountCeiling,
    })),
    approvalRules,
  }
}

export async function computeQuoteBlendedRisk(
  lines: { discountPercent: number; lineValue: number; category: string }[],
  customerTierName: string,
) {
  const { ceilings, tierDefaults } = await loadPolicyConfig()
  return computeBlendedRisk(lines, customerTierName, ceilings, tierDefaults)
}

export async function resolveApprovalChain(blendedRiskScore: number) {
  if (blendedRiskScore <= 0) {
    return []
  }

  const rules = await prisma.approvalChainRule.findMany({
    orderBy: { minRiskScore: 'asc' },
  })

  const matched = rules.find(
    (rule) =>
      blendedRiskScore > rule.minRiskScore && blendedRiskScore <= rule.maxRiskScore,
  )

  return matched?.requiredApprovers ?? []
}
