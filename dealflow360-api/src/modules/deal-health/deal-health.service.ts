import type { QuoteStatus } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { detectDiscountAnomaly } from './anomaly-detector.js'
import {
  computeStageThreshold,
  FALLBACK_THRESHOLD_DAYS,
  isStalled,
  MINIMUM_SAMPLE_SIZE,
} from './stall-detector.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const ACTIONABLE_STATUSES: QuoteStatus[] = ['DRAFT', 'PENDING_APPROVAL']
const NON_TERMINAL_STATUSES: QuoteStatus[] = ['DRAFT', 'PENDING_APPROVAL']

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY))
}

export async function getRepDiscountHistory(
  repUserId: string,
  excludeQuoteId?: string,
): Promise<number[]> {
  const lines = await prisma.quoteLine.findMany({
    where: {
      quote: {
        repUserId,
        status: { in: ['APPROVED', 'CONFIRMED'] },
        ...(excludeQuoteId ? { id: { not: excludeQuoteId } } : {}),
      },
    },
    select: { discountPercent: true },
  })

  return lines.map((line) => line.discountPercent)
}

export async function getStageDwellHistory(status: string): Promise<number[]> {
  const transitions = await prisma.quoteStageTransition.findMany({
    orderBy: [{ quoteId: 'asc' }, { transitionedAt: 'asc' }],
  })

  const byQuote = new Map<string, typeof transitions>()
  for (const row of transitions) {
    const list = byQuote.get(row.quoteId) ?? []
    list.push(row)
    byQuote.set(row.quoteId, list)
  }

  const dwells: number[] = []

  for (const quoteTransitions of byQuote.values()) {
    for (let i = 0; i < quoteTransitions.length; i++) {
      const row = quoteTransitions[i]
      if (row.fromStatus !== status) continue

      let enteredAt: Date | null = null
      for (let j = i - 1; j >= 0; j--) {
        if (quoteTransitions[j].toStatus === status) {
          enteredAt = quoteTransitions[j].transitionedAt
          break
        }
      }

      if (!enteredAt && quoteTransitions[0].toStatus === status) {
        enteredAt = quoteTransitions[0].transitionedAt
      }

      if (enteredAt) {
        dwells.push(daysBetween(enteredAt, row.transitionedAt))
      }
    }
  }

  return dwells
}

export async function getCurrentDwellTime(quoteId: string): Promise<number> {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  const entered = await prisma.quoteStageTransition.findFirst({
    where: { quoteId, toStatus: quote.status },
    orderBy: { transitionedAt: 'desc' },
  })

  if (!entered) {
    return daysBetween(quote.createdAt, new Date())
  }

  return daysBetween(entered.transitionedAt, new Date())
}

export async function getDiscountAnomalies() {
  const quotes = await prisma.quote.findMany({
    where: { status: { in: ACTIONABLE_STATUSES } },
    include: { lines: true },
  })

  const repIds = [...new Set(quotes.map((q) => q.repUserId))]
  const reps = await prisma.user.findMany({
    where: { id: { in: repIds } },
    select: { id: true, name: true },
  })
  const repNameById = new Map(reps.map((r) => [r.id, r.name]))

  const anomalies: Array<{
    quoteId: string
    lineId: string
    discountPercent: number
    zScore: number
    repName: string
  }> = []

  for (const quote of quotes) {
    const history = await getRepDiscountHistory(quote.repUserId, quote.id)

    for (const line of quote.lines) {
      const { isAnomalous, zScore } = detectDiscountAnomaly(line.discountPercent, history)
      if (isAnomalous) {
        anomalies.push({
          quoteId: quote.id,
          lineId: line.id,
          discountPercent: line.discountPercent,
          zScore: Math.round(zScore * 1000) / 1000,
          repName: repNameById.get(quote.repUserId) ?? 'Unknown',
        })
      }
    }
  }

  return anomalies
}

export async function getStalledQuotes() {
  const quotes = await prisma.quote.findMany({
    where: { status: { in: NON_TERMINAL_STATUSES } },
    orderBy: { updatedAt: 'desc' },
  })

  const thresholdCache = new Map<string, number>()

  const results = await Promise.all(
    quotes.map(async (quote) => {
      if (!thresholdCache.has(quote.status)) {
        const history = await getStageDwellHistory(quote.status)
        thresholdCache.set(quote.status, computeStageThreshold(history))
      }

      const threshold = thresholdCache.get(quote.status)!
      const dwellDays = await getCurrentDwellTime(quote.id)

      return {
        quoteId: quote.id,
        currentStatus: quote.status,
        dwellDays,
        threshold,
        isStalled: isStalled(dwellDays, threshold),
      }
    }),
  )

  return results.sort((a, b) => {
    if (a.isStalled !== b.isStalled) return a.isStalled ? -1 : 1
    return b.dwellDays - a.dwellDays
  })
}

export async function getStageThresholds() {
  const statuses: QuoteStatus[] = [
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'CONFIRMED',
  ]
  const thresholds: Array<{
    status: QuoteStatus
    thresholdDays: number
    sampleSize: number
    usingFallback: boolean
    fallbackDays: number
  }> = []

  for (const status of statuses) {
    const history = await getStageDwellHistory(status)
    const sampleSize = history.length
    const threshold = computeStageThreshold(history)

    thresholds.push({
      status,
      thresholdDays: threshold,
      sampleSize,
      usingFallback: sampleSize < MINIMUM_SAMPLE_SIZE,
      fallbackDays: FALLBACK_THRESHOLD_DAYS,
    })
  }

  return thresholds
}
