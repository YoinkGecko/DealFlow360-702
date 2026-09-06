import { describe, expect, it } from 'vitest'
import { allocateLine } from './allocator.js'

const warehouses = [
  { warehouseId: 'cheap', quantityAvailable: 10, shippingCostPerUnit: 50 },
  { warehouseId: 'mid', quantityAvailable: 10, shippingCostPerUnit: 70 },
  { warehouseId: 'expensive', quantityAvailable: 10, shippingCostPerUnit: 90 },
]

describe('allocateLine', () => {
  it('fulfills exact quantity from a single cheapest warehouse', () => {
    const result = allocateLine(5, warehouses)
    expect(result.allocations).toEqual([{ warehouseId: 'cheap', quantity: 5 }])
    expect(result.backorderedQuantity).toBe(0)
  })

  it('splits across two warehouses when cheapest cannot fulfill alone', () => {
    const stock = [
      { warehouseId: 'cheap', quantityAvailable: 3, shippingCostPerUnit: 50 },
      { warehouseId: 'mid', quantityAvailable: 10, shippingCostPerUnit: 70 },
      { warehouseId: 'expensive', quantityAvailable: 10, shippingCostPerUnit: 90 },
    ]
    const result = allocateLine(7, stock)
    expect(result.allocations).toEqual([
      { warehouseId: 'cheap', quantity: 3 },
      { warehouseId: 'mid', quantity: 4 },
    ])
    expect(result.backorderedQuantity).toBe(0)
  })

  it('splits across three warehouses greedily by shipping cost', () => {
    const stock = [
      { warehouseId: 'cheap', quantityAvailable: 2, shippingCostPerUnit: 50 },
      { warehouseId: 'mid', quantityAvailable: 3, shippingCostPerUnit: 70 },
      { warehouseId: 'expensive', quantityAvailable: 4, shippingCostPerUnit: 90 },
    ]
    const result = allocateLine(8, stock)
    expect(result.allocations).toEqual([
      { warehouseId: 'cheap', quantity: 2 },
      { warehouseId: 'mid', quantity: 3 },
      { warehouseId: 'expensive', quantity: 3 },
    ])
    expect(result.backorderedQuantity).toBe(0)
  })

  it('creates backorder when total stock is insufficient', () => {
    const stock = [
      { warehouseId: 'cheap', quantityAvailable: 2, shippingCostPerUnit: 50 },
      { warehouseId: 'mid', quantityAvailable: 1, shippingCostPerUnit: 70 },
    ]
    const result = allocateLine(10, stock)
    expect(result.allocations).toEqual([
      { warehouseId: 'cheap', quantity: 2 },
      { warehouseId: 'mid', quantity: 1 },
    ])
    expect(result.backorderedQuantity).toBe(7)
  })
})
