import type { QuoteStatus } from '@prisma/client'
import type { DomainEvent } from '../../core/event-bus.js'
import { prisma } from '../../db/client.js'

/** Events that may change quote.status — listener derives transitions from DB state after these fire. */
const STATUS_AFFECTING_EVENTS = new Set([
  'QuoteCreated',
  'ApprovalRequested',
  'QuoteAutoApproved',
  'ApprovalDecided',
  'QuoteConfirmed',
  'QuoteSent',
  'ChangeRequestSubmitted',
  'QuoteReenteredApproval',
])

export async function recordStageTransitionIfChanged(
  quoteId: string,
  toStatus: QuoteStatus,
  transitionedAt: Date,
) {
  const last = await prisma.quoteStageTransition.findFirst({
    where: { quoteId },
    orderBy: { transitionedAt: 'desc' },
  })

  const fromStatus = last?.toStatus ?? 'INITIAL'
  if (fromStatus === toStatus) return

  await prisma.quoteStageTransition.create({
    data: {
      quoteId,
      fromStatus,
      toStatus,
      transitionedAt,
    },
  })
}

export function registerStageTransitionListener(
  subscribe: (eventType: string, handler: (event: DomainEvent) => void) => void,
) {
  for (const eventType of STATUS_AFFECTING_EVENTS) {
    subscribe(eventType, (event: DomainEvent) => {
      setImmediate(() => {
        void (async () => {
          const quote = await prisma.quote.findUnique({ where: { id: event.aggregateId } })
          if (!quote) return
          await recordStageTransitionIfChanged(
            event.aggregateId,
            quote.status,
            event.createdAt,
          )
        })()
      })
    })
  }
}
