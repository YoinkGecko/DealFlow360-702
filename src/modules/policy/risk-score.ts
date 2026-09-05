export interface RiskLineInput {
  discountPercent: number
  lineValue: number
  category: string
}

export interface CeilingInput {
  category: string
  customerTier: string
  ceilingPercent: number
}

export interface TierDefaultInput {
  name: string
  defaultDiscountCeiling: number
}

/**
 * Pure blended risk score — value-weighted average line overage.
 * Returns 0 when there are no lines or no overages.
 */
export function computeBlendedRisk(
  lines: RiskLineInput[],
  customerTier: string,
  ceilings: CeilingInput[],
  tierDefaults: TierDefaultInput[],
): number {
  if (lines.length === 0) return 0

  const tierDefault =
    tierDefaults.find((t) => t.name === customerTier)?.defaultDiscountCeiling ?? 0

  const totalValue = lines.reduce((sum, line) => sum + line.lineValue, 0)
  if (totalValue === 0) return 0

  let weightedOverage = 0

  for (const line of lines) {
    const ceiling =
      ceilings.find(
        (c) => c.category === line.category && c.customerTier === customerTier,
      )?.ceilingPercent ?? tierDefault

    if (ceiling <= 0) continue

    const lineOverage = Math.max(0, (line.discountPercent - ceiling) / ceiling)
    weightedOverage += lineOverage * (line.lineValue / totalValue)
  }

  return weightedOverage
}
