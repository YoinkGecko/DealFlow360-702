import { describe, expect, it } from 'vitest'
import { computeProratedCharge } from './proration.js'

describe('computeProratedCharge', () => {
  const cycleStart = new Date('2026-01-01T00:00:00.000Z')
  const cycleEnd = new Date('2026-01-31T00:00:00.000Z') // 30-day cycle
  const changeDate = new Date('2026-01-11T00:00:00.000Z') // day 10 of cycle

  it('prorates upgrade mid-cycle: ₹3000/month, +1 unit on day 10 → ₹2000', () => {
    const charge = computeProratedCharge(3000, 1, cycleStart, cycleEnd, changeDate)
    expect(charge).toBeCloseTo(2000, 2)
  })

  it('prorates downgrade mid-cycle: ₹3000/month, -1 unit on day 10 → -₹2000', () => {
    const credit = computeProratedCharge(3000, -1, cycleStart, cycleEnd, changeDate)
    expect(credit).toBeCloseTo(-2000, 2)
  })

  it('returns 0 when delta quantity is 0', () => {
    expect(computeProratedCharge(3000, 0, cycleStart, cycleEnd, changeDate)).toBe(0)
  })
})
