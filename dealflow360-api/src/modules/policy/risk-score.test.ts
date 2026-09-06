import { describe, expect, it } from 'vitest'
import { computeBlendedRisk } from './risk-score.js'

const goldCeilings = [
  { category: 'Hardware', customerTier: 'Gold', ceilingPercent: 15 },
  { category: 'Service', customerTier: 'Gold', ceilingPercent: 10 },
]

const tierDefaults = [
  { name: 'Bronze', defaultDiscountCeiling: 5 },
  { name: 'Gold', defaultDiscountCeiling: 15 },
]

describe('computeBlendedRisk', () => {
  it('returns 0 when no lines are over ceiling', () => {
    const risk = computeBlendedRisk(
      [
        { category: 'Hardware', discountPercent: 12, lineValue: 480000 },
        { category: 'Service', discountPercent: 8, lineValue: 320000 },
      ],
      'Gold',
      goldCeilings,
      tierDefaults,
    )
    expect(risk).toBe(0)
  })

  it('returns 0 when there are no lines', () => {
    expect(computeBlendedRisk([], 'Gold', goldCeilings, tierDefaults)).toBe(0)
  })

  it('returns high score when one line is way over ceiling (Gold Hardware/Service example)', () => {
    // Laptop 12% on Hardware (15% ceiling) = OK
    // Setup Service 18% on Service (10% ceiling) = 80% overage
    const risk = computeBlendedRisk(
      [
        { category: 'Hardware', discountPercent: 12, lineValue: 422400 },
        { category: 'Service', discountPercent: 18, lineValue: 262400 },
      ],
      'Gold',
      goldCeilings,
      tierDefaults,
    )
    // Service line overage: (18-10)/10 = 0.8, weighted by line value share
    expect(risk).toBeGreaterThan(0.3)
    expect(risk).toBeLessThan(0.6)
  })

  it('returns moderate score when many lines are slightly over (blended scenario)', () => {
    const risk = computeBlendedRisk(
      [
        { category: 'Hardware', discountPercent: 17, lineValue: 200000 },
        { category: 'Hardware', discountPercent: 16, lineValue: 200000 },
        { category: 'Service', discountPercent: 12, lineValue: 200000 },
      ],
      'Gold',
      goldCeilings,
      tierDefaults,
    )
    // Each line slightly over — none catastrophic alone, but blended adds up
    expect(risk).toBeGreaterThan(0)
    expect(risk).toBeLessThan(0.5)
  })

  it('falls back to tier default ceiling when no category-specific ceiling exists', () => {
    const risk = computeBlendedRisk(
      [{ category: 'Subscription', discountPercent: 20, lineValue: 100000 }],
      'Gold',
      goldCeilings,
      tierDefaults,
    )
    // 20% vs 15% default → overage (20-15)/15 = 0.333
    expect(risk).toBeCloseTo(0.333, 2)
  })

  it('uses Bronze Hardware ceiling of 5%', () => {
    const bronzeCeilings = [
      { category: 'Hardware', customerTier: 'Bronze', ceilingPercent: 5 },
    ]
    const risk = computeBlendedRisk(
      [{ category: 'Hardware', discountPercent: 8, lineValue: 50000 }],
      'Bronze',
      bronzeCeilings,
      tierDefaults,
    )
    expect(risk).toBeCloseTo((8 - 5) / 5, 2)
  })
})
