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

export async function listEventsForAggregate(
  aggregateId: string,
  page = 1,
  limit = 20,
) {
  const { paginateParams, paginatedResult } = await import('./pagination.js')
  const { skip, take, page: p, limit: l } = paginateParams(page, limit)
  const where = { aggregateId }
  const [events, total] = await Promise.all([
    prisma.event.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take }),
    prisma.event.count({ where }),
  ])
  return paginatedResult(events, total, p, l)
}
