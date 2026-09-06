import type { PrismaClient } from '@prisma/client'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

export interface StageBackfillConfig {
  quoteId: string
  /** Days spent in PENDING_APPROVAL before approval */
  pendingDwellDays: number
  /** Days spent in DRAFT before submit */
  draftDwellDays?: number
}

/**
 * Backfills QuoteStageTransition rows for seeded historical quotes.
 * Simulates realistic dwell times before real production usage exists.
 * Re-run via: npm run seed:stage-transitions
 */
export async function backfillQuoteStageTransitions(
  prisma: PrismaClient,
  configs: StageBackfillConfig[],
) {
  await prisma.quoteStageTransition.deleteMany({
    where: { quoteId: { in: configs.map((c) => c.quoteId) } },
  })

  for (const config of configs) {
    const quote = await prisma.quote.findUnique({ where: { id: config.quoteId } })
    if (!quote) continue

    const draftDays = config.draftDwellDays ?? 2 + (configs.indexOf(config) % 4)
    const pendingDays = config.pendingDwellDays

    const t0 = addDays(quote.createdAt, 0)
    const t1 = addDays(t0, draftDays)
    const t2 = addDays(t1, pendingDays)
    const t3 = addDays(t2, 1)

    await prisma.quoteStageTransition.createMany({
      data: [
        { quoteId: config.quoteId, fromStatus: 'INITIAL', toStatus: 'DRAFT', transitionedAt: t0 },
        {
          quoteId: config.quoteId,
          fromStatus: 'DRAFT',
          toStatus: 'PENDING_APPROVAL',
          transitionedAt: t1,
        },
        {
          quoteId: config.quoteId,
          fromStatus: 'PENDING_APPROVAL',
          toStatus: 'APPROVED',
          transitionedAt: t2,
        },
        {
          quoteId: config.quoteId,
          fromStatus: 'APPROVED',
          toStatus: 'CONFIRMED',
          transitionedAt: t3,
        },
      ],
    })
  }
}

export async function backfillAllConfirmedQuoteTransitions(prisma: PrismaClient) {
  const confirmed = await prisma.quote.findMany({
    where: { status: 'CONFIRMED' },
    orderBy: { createdAt: 'asc' },
  })

  const configs: StageBackfillConfig[] = confirmed.map((quote, index) => ({
    quoteId: quote.id,
    pendingDwellDays: index < 2 ? 16 + index : 2 + (index % 4),
    draftDwellDays: 1 + (index % 3),
  }))

  await backfillQuoteStageTransitions(prisma, configs)
  return configs.length
}
