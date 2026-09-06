import { describe, expect, it } from 'vitest'
import { detectDiscountAnomaly } from './anomaly-detector.js'

describe('detectDiscountAnomaly', () => {
  const repHistory = [6, 7, 5, 8, 6, 7, 6, 5, 7, 6]

  it('does not flag a discount close to the rep average', () => {
    const result = detectDiscountAnomaly(6.5, repHistory)
    expect(result.isAnomalous).toBe(false)
    expect(Math.abs(result.zScore)).toBeLessThan(2)
  })

  it('flags a discount several standard deviations above average', () => {
    const result = detectDiscountAnomaly(25, repHistory)
    expect(result.isAnomalous).toBe(true)
    expect(result.zScore).toBeGreaterThan(2)
  })

  it('never flags when fewer than 5 historical discounts', () => {
    const result = detectDiscountAnomaly(99, [6, 7, 5, 8])
    expect(result.isAnomalous).toBe(false)
    expect(result.zScore).toBe(0)
  })

  it('handles zero variance without crashing', () => {
    const result = detectDiscountAnomaly(8, [6, 6, 6, 6, 6])
    expect(result.zScore).toBe(0)
    expect(result.isAnomalous).toBe(true)
  })

  it('does not flag when zero variance and discount equals mean', () => {
    const result = detectDiscountAnomaly(6, [6, 6, 6, 6, 6])
    expect(result.isAnomalous).toBe(false)
    expect(result.zScore).toBe(0)
  })
})
