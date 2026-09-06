import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { productIdParamSchema, errorSchema } from '../../core/schemas.js'
import { handleRouteError } from '../../core/errors.js'
import * as recsService from './recs.service.js'

const recommendationSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  liftScore: z.number(),
  promotionTag: z.string().optional(),
})

export async function recsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/products/:productId/recommendations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Recommendations'],
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        querystring: z.object({
          limit: z.coerce.number().int().positive().max(20).optional(),
        }),
        response: {
          200: z.object({
            productId: z.string().uuid(),
            recommendations: z.array(recommendationSchema),
          }),
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const product = await recsService.getTopRecommendations(
          request.params.productId,
          request.query.limit ?? 3,
        )

        return {
          productId: request.params.productId,
          recommendations: product,
        }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
