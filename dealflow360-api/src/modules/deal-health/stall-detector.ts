/** Cold start default, used until this stage has enough closed-deal history to compute its own statistics. */
export const FALLBACK_THRESHOLD_DAYS = 7

export const MINIMUM_SAMPLE_SIZE = 8

export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0
  const index = (sortedValues.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]
  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

export function computeStageThreshold(historicalDwellDaysForStage: number[]): number {
  if (historicalDwellDaysForStage.length < MINIMUM_SAMPLE_SIZE) {
    return FALLBACK_THRESHOLD_DAYS
  }

  const sorted = [...historicalDwellDaysForStage].sort((a, b) => a - b)
  const q1 = percentile(sorted, 0.25)
  const q3 = percentile(sorted, 0.75)
  const iqr = q3 - q1
  const mean =
    historicalDwellDaysForStage.reduce((sum, value) => sum + value, 0) /
    historicalDwellDaysForStage.length

  return mean + 1.5 * iqr
}

export function isStalled(currentDwellDays: number, threshold: number): boolean {
  return currentDwellDays > threshold
}
