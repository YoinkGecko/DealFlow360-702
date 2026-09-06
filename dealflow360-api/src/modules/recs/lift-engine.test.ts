import { describe, expect, it } from 'vitest'
import { computeLift } from './lift-engine.js'

describe('computeLift', () => {
  const totalOrders = 100

  it('returns lift > 1 for a genuinely correlated pair', () => {
    // Laptop appears in 50 orders, Bag in 40, together in 35
    const lift = computeLift(35, 50, 40, totalOrders)
    expect(lift).toBeGreaterThan(1)
    expect(lift).toBeCloseTo(1.75, 2)
  })

  it('returns lift ~1 for an uncorrelated pair', () => {
    // Independent: co-occurrence ≈ (50*40)/100 = 20
    const lift = computeLift(20, 50, 40, totalOrders)
    expect(lift).toBeCloseTo(1, 2)
  })

  it('returns 0 when countA or countB is 0', () => {
    expect(computeLift(5, 0, 10, totalOrders)).toBe(0)
    expect(computeLift(5, 10, 0, totalOrders)).toBe(0)
  })

  it('returns 0 when totalOrders is 0', () => {
    expect(computeLift(5, 10, 20, 0)).toBe(0)
  })
})
