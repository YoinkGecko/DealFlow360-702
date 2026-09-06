export function computeLift(
  coOccurrenceCount: number,
  countA: number,
  countB: number,
  totalOrders: number,
): number {
  if (countA === 0 || countB === 0 || totalOrders === 0) {
    return 0
  }
  return (coOccurrenceCount * totalOrders) / (countA * countB)
}

/** Normalize pair so productIdA < productIdB (lexicographic). */
export function normalizeProductPair(productIdA: string, productIdB: string): [string, string] {
  return productIdA < productIdB ? [productIdA, productIdB] : [productIdB, productIdA]
}
