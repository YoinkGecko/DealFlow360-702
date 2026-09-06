import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  errorSchema,
  eventSchema,
  paginationQuerySchema,
  paginatedMetaSchema,
  quoteIdParamSchema,
  replayQuoteBodySchema,
} from '../../core/schemas.js'
import { handleRouteError } from '../../core/errors.js'
import { getEventsForAggregate, listEventsForAggregate } from '../../core/event-store.js'
import { replayQuoteWhatIf } from './replay.js'

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
        querystring: paginationQuerySchema,
        response: {
          200: z.object({
            aggregateId: z.string().uuid(),
            items: z.array(eventSchema),
            ...paginatedMetaSchema.shape,
          }),
          404: errorSchema,
        },
      },
    },
    async (request) => {
      const result = await listEventsForAggregate(
        request.params.id,
        request.query.page,
        request.query.limit,
      )
      return {
        aggregateId: request.params.id,
        ...result,
        items: result.items.map((e) => ({
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

  server.post(
    '/audit/quotes/:id/replay',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Audit'],
        description:
          'What-if replay: reconstruct lines from events only, compare actual vs hypothetical risk and routing',
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        body: replayQuoteBodySchema,
        response: {
          200: z.object({
            actual: z.object({
              riskScore: z.number(),
              routing: z.array(z.string()),
            }),
            hypothetical: z.object({
              riskScore: z.number(),
              routing: z.array(z.string()),
            }),
            changed: z.boolean(),
            linesUsedInReplay: z.array(
              z.object({
                lineId: z.string().uuid(),
                productId: z.string().uuid(),
                quantity: z.number(),
                discountPercent: z.number(),
                lineValue: z.number(),
                category: z.string(),
              }),
            ),
          }),
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await replayQuoteWhatIf(request.params.id, request.body.hypotheticalCeilings)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
