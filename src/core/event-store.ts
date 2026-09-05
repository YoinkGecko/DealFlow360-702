import type { Prisma } from '@prisma/client'
import { prisma } from '../db/client.js'
import { eventBus } from './event-bus.js'

export interface AppendEventInput {
  aggregateId: string
  aggregateType: string
  type: string
  payload: Prisma.InputJsonValue
  actorUserId?: string | null
}

export async function appendEvent(input: AppendEventInput) {
  const event = await prisma.event.create({
    data: {
      aggregateId: input.aggregateId,
      aggregateType: input.aggregateType,
      type: input.type,
      payload: input.payload,
      actorUserId: input.actorUserId ?? null,
    },
  })

  eventBus.emit(event)
  return event
}

export async function getEventsForAggregate(aggregateId: string) {
  return prisma.event.findMany({
    where: { aggregateId },
    orderBy: { createdAt: 'asc' },
  })
}
