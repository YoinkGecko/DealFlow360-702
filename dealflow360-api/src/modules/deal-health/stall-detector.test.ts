import { describe, expect, it } from 'vitest'
import {
  computeStageThreshold,
  FALLBACK_THRESHOLD_DAYS,
  isStalled,
  MINIMUM_SAMPLE_SIZE,
  percentile,
} from './stall-detector.js'

describe('percentile', () => {
  it('computes Q1 and Q3 for a known sorted array', () => {
    const sorted = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20]
    expect(percentile(sorted, 0.25)).toBeCloseTo(4.75, 1)
    expect(percentile(sorted, 0.75)).toBeCloseTo(10.25, 1)
  })
})

describe('computeStageThreshold', () => {
  it(`returns fallback when fewer than ${MINIMUM_SAMPLE_SIZE} samples`, () => {
    expect(computeStageThreshold([2, 3, 4, 5, 6, 7])).toBe(FALLBACK_THRESHOLD_DAYS)
  })

  it('computes IQR-based threshold without being dragged to a single outlier', () => {
    const dwells = [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 18]
    const threshold = computeStageThreshold(dwells)
    expect(threshold).toBeGreaterThan(6)
    expect(threshold).toBeLessThan(15)
  })

  it('returns a reasonable threshold for a normal spread', () => {
    const dwells = [2, 3, 3, 4, 4, 4, 5, 5, 5, 6]
    const threshold = computeStageThreshold(dwells)
    expect(threshold).toBeGreaterThan(4)
    expect(threshold).toBeLessThan(10)
  })
})

describe('isStalled', () => {
  it('returns true when dwell exceeds threshold', () => {
    expect(isStalled(10, 7)).toBe(true)
  })

  it('returns false when dwell is within threshold', () => {
    expect(isStalled(5, 7)).toBe(false)
  })
})
