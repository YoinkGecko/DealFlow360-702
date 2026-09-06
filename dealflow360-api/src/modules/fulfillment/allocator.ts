export interface WarehouseStock {
  warehouseId: string
  quantityAvailable: number
  shippingCostPerUnit: number
}

export interface LineAllocation {
  warehouseId: string
  quantity: number
}

export interface AllocateLineResult {
  allocations: LineAllocation[]
  backorderedQuantity: number
}

export function allocateLine(
  quantityNeeded: number,
  stockByWarehouse: WarehouseStock[],
): AllocateLineResult {
  if (quantityNeeded <= 0) {
    return { allocations: [], backorderedQuantity: 0 }
  }

  const sorted = [...stockByWarehouse].sort(
    (a, b) => a.shippingCostPerUnit - b.shippingCostPerUnit,
  )

  let remaining = quantityNeeded
  const allocations: LineAllocation[] = []

  for (const warehouse of sorted) {
    if (remaining <= 0) break
    if (warehouse.quantityAvailable <= 0) continue

    const take = Math.min(remaining, warehouse.quantityAvailable)
    allocations.push({ warehouseId: warehouse.warehouseId, quantity: take })
    remaining -= take
  }

  return {
    allocations,
    backorderedQuantity: remaining,
  }
}
