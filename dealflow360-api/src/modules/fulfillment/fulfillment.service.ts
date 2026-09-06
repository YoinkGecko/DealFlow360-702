import { randomUUID } from 'node:crypto'
import { prisma } from '../../db/client.js'
import { appendEvent } from '../../core/event-store.js'
import { allocateLine } from './allocator.js'

type StockKey = string

function stockKey(warehouseId: string, productId: string): StockKey {
  return `${warehouseId}:${productId}`
}

async function restoreAllocationsForQuote(quoteId: string) {
  const lines = await prisma.quoteLine.findMany({
    where: { quoteId },
    include: { allocations: true, backorders: true },
  })

  for (const line of lines) {
    for (const allocation of line.allocations) {
      await prisma.stockLevel.updateMany({
        where: {
          warehouseId: allocation.warehouseId,
          productId: line.productId,
        },
        data: {
          quantityAvailable: { increment: allocation.quantityAllocated },
        },
      })
    }
  }

  const lineIds = lines.map((l) => l.id)
  if (lineIds.length > 0) {
    await prisma.allocation.deleteMany({ where: { quoteLineId: { in: lineIds } } })
    await prisma.backorder.deleteMany({ where: { quoteLineId: { in: lineIds } } })
  }
}

export async function allocateQuoteFulfillment(
  quoteId: string,
  actorUserId?: string | null,
  options?: { skipStatusCheck?: boolean },
) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lines: { include: { product: true } },
    },
  })

  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  if (!options?.skipStatusCheck && quote.status !== 'APPROVED') {
    throw Object.assign(
      new Error('Fulfillment allocation is only allowed for APPROVED quotes'),
      { statusCode: 400 },
    )
  }

  if (quote.lines.length === 0) {
    throw Object.assign(new Error('Quote has no lines to allocate'), { statusCode: 400 })
  }

  await restoreAllocationsForQuote(quoteId)

  const productIds = [...new Set(quote.lines.map((l) => l.productId))]
  const stockRows = await prisma.stockLevel.findMany({
    where: { productId: { in: productIds } },
    include: { warehouse: true },
  })

  const availableStock = new Map<StockKey, number>()
  for (const row of stockRows) {
    availableStock.set(stockKey(row.warehouseId, row.productId), row.quantityAvailable)
  }

  const lineResults: Array<{
    quoteLineId: string
    productId: string
    productName: string
    quantityRequested: number
    allocations: Array<{ warehouseId: string; warehouseName: string; quantity: number }>
    backorderedQuantity: number
  }> = []

  for (const line of quote.lines) {
    const stockByWarehouse = stockRows
      .filter((s) => s.productId === line.productId)
      .map((s) => ({
        warehouseId: s.warehouseId,
        quantityAvailable: availableStock.get(stockKey(s.warehouseId, s.productId)) ?? 0,
        shippingCostPerUnit: s.warehouse.shippingCostPerUnit,
      }))

    const result = allocateLine(line.quantity, stockByWarehouse)

    for (const allocation of result.allocations) {
      const key = stockKey(allocation.warehouseId, line.productId)
      const current = availableStock.get(key) ?? 0
      availableStock.set(key, current - allocation.quantity)

      await prisma.stockLevel.updateMany({
        where: { warehouseId: allocation.warehouseId, productId: line.productId },
        data: { quantityAvailable: { decrement: allocation.quantity } },
      })

      await prisma.allocation.create({
        data: {
          id: randomUUID(),
          quoteLineId: line.id,
          warehouseId: allocation.warehouseId,
          quantityAllocated: allocation.quantity,
        },
      })
    }

    if (result.backorderedQuantity > 0) {
      await prisma.backorder.create({
        data: {
          id: randomUUID(),
          quoteLineId: line.id,
          quantityBackordered: result.backorderedQuantity,
        },
      })
    }

    const warehouseNames = new Map(stockRows.map((s) => [s.warehouseId, s.warehouse.name]))

    const lineResult = {
      quoteLineId: line.id,
      productId: line.productId,
      productName: line.product.name,
      quantityRequested: line.quantity,
      allocations: result.allocations.map((a) => ({
        warehouseId: a.warehouseId,
        warehouseName: warehouseNames.get(a.warehouseId) ?? a.warehouseId,
        quantity: a.quantity,
      })),
      backorderedQuantity: result.backorderedQuantity,
    }

    lineResults.push(lineResult)

    await appendEvent({
      aggregateId: quoteId,
      aggregateType: 'Quote',
      type: 'StockAllocated',
      payload: lineResult,
      actorUserId: actorUserId ?? null,
    })
  }

  return { quoteId, lines: lineResults }
}

export async function getQuoteFulfillment(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lines: {
        include: {
          product: true,
          allocations: { include: { warehouse: true } },
          backorders: true,
        },
      },
    },
  })

  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  return {
    quoteId: quote.id,
    status: quote.status,
    lines: quote.lines.map((line) => ({
      quoteLineId: line.id,
      productId: line.productId,
      productName: line.product.name,
      quantityRequested: line.quantity,
      allocations: line.allocations.map((a) => ({
        warehouseId: a.warehouseId,
        warehouseName: a.warehouse.name,
        quantity: a.quantityAllocated,
      })),
      backorderedQuantity: line.backorders.reduce((sum, b) => sum + b.quantityBackordered, 0),
      backorders: line.backorders.map((b) => ({
        id: b.id,
        quantityBackordered: b.quantityBackordered,
        createdAt: b.createdAt,
        fulfilledAt: b.fulfilledAt,
      })),
    })),
  }
}

export async function tryAutoAllocateOnApproval(quoteId: string, actorUserId?: string | null) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote || quote.status !== 'APPROVED') return null

  try {
    return await allocateQuoteFulfillment(quoteId, actorUserId)
  } catch (err) {
    console.warn('[fulfillment] Auto-allocation skipped:', err)
    return null
  }
}

export async function listWarehousesWithStock() {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      stockLevels: {
        include: { product: true },
        orderBy: { product: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return warehouses.map((warehouse) => ({
    id: warehouse.id,
    name: warehouse.name,
    shippingCostPerUnit: warehouse.shippingCostPerUnit,
    createdAt: warehouse.createdAt.toISOString(),
    stockLevels: warehouse.stockLevels.map((level) => ({
      productId: level.productId,
      productName: level.product.name,
      quantityAvailable: level.quantityAvailable,
    })),
  }))
}
