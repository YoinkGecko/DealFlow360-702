export interface DiscountAnomalyResult {
  isAnomalous: boolean
  zScore: number
}

const MIN_HISTORY_SIZE = 5

export function detectDiscountAnomaly(
  currentDiscount: number,
  repHistoricalDiscounts: number[],
): DiscountAnomalyResult {
  if (repHistoricalDiscounts.length < MIN_HISTORY_SIZE) {
    return { isAnomalous: false, zScore: 0 }
  }

  const mean =
    repHistoricalDiscounts.reduce((sum, value) => sum + value, 0) /
    repHistoricalDiscounts.length

  const variance =
    repHistoricalDiscounts.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    repHistoricalDiscounts.length
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) {
    return {
      isAnomalous: currentDiscount > mean,
      zScore: 0,
    }
  }

  const zScore = (currentDiscount - mean) / stdDev
  return {
    isAnomalous: zScore > 2,
    zScore,
  }
}
