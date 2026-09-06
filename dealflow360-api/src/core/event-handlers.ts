import type { DomainEvent } from '../core/event-bus.js'
import { eventBus } from '../core/event-bus.js'
import { prisma } from '../db/client.js'
import { tryAutoAllocateOnApproval } from '../modules/fulfillment/fulfillment.service.js'
import { handleQuoteConfirmedBillingStub } from '../modules/billing/billing.service.js'
import { handleQuoteConfirmedForRecs } from '../modules/recs/recs.service.js'
import { registerStageTransitionListener } from '../modules/deal-health/stage-transition.listener.js'

export function registerEventHandlers() {
  registerStageTransitionListener((eventType, handler) => {
    eventBus.subscribe(eventType, handler)
  })

  eventBus.subscribe('QuoteAutoApproved', (event: DomainEvent) => {
    setImmediate(() => {
      void tryAutoAllocateOnApproval(event.aggregateId, event.actorUserId)
    })
  })

  eventBus.subscribe('ApprovalDecided', (event: DomainEvent) => {
    const payload = event.payload as { decision?: string }
    if (payload.decision !== 'APPROVED') return

    setImmediate(() => {
      void (async () => {
        const quote = await prisma.quote.findUnique({ where: { id: event.aggregateId } })
        if (quote?.status === 'APPROVED') {
          await tryAutoAllocateOnApproval(event.aggregateId, event.actorUserId)
        }
      })()
    })
  })

  eventBus.subscribe('QuoteConfirmed', async (event: DomainEvent) => {
    await handleQuoteConfirmedForRecs(event.aggregateId)
    await handleQuoteConfirmedBillingStub(event.aggregateId)
  })
}
