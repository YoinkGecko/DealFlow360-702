import { prisma } from '../../db/client.js'
import { computeLift, normalizeProductPair } from './lift-engine.js'

export async function getTopRecommendations(productId: string, limit = 3) {
  const coOccurrences = await prisma.productCoOccurrence.findMany({
    where: {
      OR: [{ productIdA: productId }, { productIdB: productId }],
    },
  })

  const purchaseCounts = await prisma.productPurchaseCount.findMany()
  const countByProduct = new Map(purchaseCounts.map((p) => [p.productId, p.totalOrderCount]))
  const totalOrders = await prisma.quote.count({ where: { status: 'CONFIRMED' } })

  const scored: Array<{ productId: string; liftScore: number }> = []

  for (const row of coOccurrences) {
    const pairedProductId = row.productIdA === productId ? row.productIdB : row.productIdA
    const countA = countByProduct.get(productId) ?? 0
    const countB = countByProduct.get(pairedProductId) ?? 0
    const liftScore = computeLift(row.coOccurrenceCount, countA, countB, totalOrders)

    if (liftScore > 1) {
      scored.push({ productId: pairedProductId, liftScore })
    }
  }

  scored.sort((a, b) => b.liftScore - a.liftScore)
  const top = scored.slice(0, limit)

  const products = await prisma.product.findMany({
    where: { id: { in: top.map((t) => t.productId) } },
    select: { id: true, name: true, isPromoted: true, promotionTag: true },
  })
  const productById = new Map(products.map((p) => [p.id, p]))

  return top.map((item) => {
    const product = productById.get(item.productId)
    const base = {
      productId: item.productId,
      productName: product?.name ?? 'Unknown product',
      liftScore: Math.round(item.liftScore * 1000) / 1000,
    }
    if (product?.isPromoted && product.promotionTag) {
      return { ...base, promotionTag: product.promotionTag }
    }
    return base
  })
}

export async function updateCoOccurrenceFromQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: true },
  })

  if (!quote) return

  const productIds = [...new Set(quote.lines.map((l) => l.productId))]
  if (productIds.length === 0) return

  for (const productId of productIds) {
    const existing = await prisma.productPurchaseCount.findUnique({
      where: { productId },
    })

    if (existing) {
      await prisma.productPurchaseCount.update({
        where: { productId },
        data: { totalOrderCount: { increment: 1 } },
      })
    } else {
      await prisma.productPurchaseCount.create({
        data: { productId, totalOrderCount: 1 },
      })
    }
  }

  for (let i = 0; i < productIds.length; i++) {
    for (let j = i + 1; j < productIds.length; j++) {
      const [productIdA, productIdB] = normalizeProductPair(productIds[i], productIds[j])

      const existing = await prisma.productCoOccurrence.findUnique({
        where: { productIdA_productIdB: { productIdA, productIdB } },
      })

      if (existing) {
        await prisma.productCoOccurrence.update({
          where: { id: existing.id },
          data: { coOccurrenceCount: { increment: 1 } },
        })
      } else {
        await prisma.productCoOccurrence.create({
          data: { productIdA, productIdB, coOccurrenceCount: 1 },
        })
      }
    }
  }
}

export async function recomputeCoOccurrenceFromHistory() {
  await prisma.productCoOccurrence.deleteMany()
  await prisma.productPurchaseCount.deleteMany()

  const confirmedQuotes = await prisma.quote.findMany({
    where: { status: 'CONFIRMED' },
    include: { lines: true },
  })

  for (const quote of confirmedQuotes) {
    await updateCoOccurrenceFromQuote(quote.id)
  }

  const pairCount = await prisma.productCoOccurrence.count()
  const productCount = await prisma.productPurchaseCount.count()

  return {
    confirmedQuotesProcessed: confirmedQuotes.length,
    coOccurrencePairs: pairCount,
    productPurchaseCounts: productCount,
  }
}

export async function handleQuoteConfirmedForRecs(quoteId: string) {
  await updateCoOccurrenceFromQuote(quoteId)
}
