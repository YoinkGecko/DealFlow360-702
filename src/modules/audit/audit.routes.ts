import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { errorSchema, eventSchema, quoteIdParamSchema } from '../../core/schemas.js'
import { getEventsForAggregate } from '../../core/event-store.js'

export async function auditRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/audit/quotes/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Audit'],
        description:
          'Full ordered event history for a quote — straight from the append-only events table',
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: {
          200: z.object({
            aggregateId: z.string().uuid(),
            events: z.array(eventSchema),
          }),
          404: errorSchema,
        },
      },
    },
    async (request) => {
      const events = await getEventsForAggregate(request.params.id)
      return {
        aggregateId: request.params.id,
        events: events.map((e) => ({
          id: e.id,
          aggregateId: e.aggregateId,
          aggregateType: e.aggregateType,
          type: e.type,
          payload: e.payload,
          actorUserId: e.actorUserId,
          createdAt: e.createdAt.toISOString(),
        })),
      }
    },
  )
}
