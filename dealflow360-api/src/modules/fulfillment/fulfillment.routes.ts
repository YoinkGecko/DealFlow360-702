import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { quoteIdParamSchema, errorSchema, quoteStatusSchema } from '../../core/schemas.js'
import { getAuthUser, requireRoles } from '../../core/auth-middleware.js'
import { handleRouteError } from '../../core/errors.js'
import * as fulfillmentService from './fulfillment.service.js'

const allocationBreakdownSchema = z.object({
  warehouseId: z.string().uuid(),
  warehouseName: z.string(),
  quantity: z.number().int(),
})

const fulfillmentLineSchema = z.object({
  quoteLineId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  quantityRequested: z.number().int(),
  allocations: z.array(allocationBreakdownSchema),
  backorderedQuantity: z.number().int(),
  backorders: z
    .array(
      z.object({
        id: z.string().uuid(),
        quantityBackordered: z.number().int(),
        createdAt: z.string().datetime(),
        fulfilledAt: z.string().datetime().nullable(),
      }),
    )
    .optional(),
})

const fulfillmentResponseSchema = z.object({
  quoteId: z.string().uuid(),
  status: quoteStatusSchema.optional(),
  lines: z.array(fulfillmentLineSchema),
})

const warehouseStockLevelSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  quantityAvailable: z.number().int(),
})

const warehouseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  shippingCostPerUnit: z.number(),
  createdAt: z.string().datetime(),
  stockLevels: z.array(warehouseStockLevelSchema),
})

export async function fulfillmentRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/warehouses',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Fulfillment'],
        description: 'All warehouses with current stock levels joined in',
        security: [{ bearerAuth: [] }],
        response: { 200: z.object({ warehouses: z.array(warehouseSchema) }) },
      },
    },
    async () => {
      const warehouses = await fulfillmentService.listWarehousesWithStock()
      return { warehouses }
    },
  )

  server.post(
    '/quotes/:id/fulfillment/allocate',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'MANAGER', 'ADMIN')],
      schema: {
        tags: ['Fulfillment'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: {
          200: fulfillmentResponseSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const result = await fulfillmentService.allocateQuoteFulfillment(
          request.params.id,
          user.sub,
        )
        return result
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.get(
    '/quotes/:id/fulfillment',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Fulfillment'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: { 200: fulfillmentResponseSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const result = await fulfillmentService.getQuoteFulfillment(request.params.id)
        return {
          ...result,
          lines: result.lines.map((line) => ({
            ...line,
            backorders: line.backorders.map((b) => ({
              id: b.id,
              quantityBackordered: b.quantityBackordered,
              createdAt: b.createdAt.toISOString(),
              fulfilledAt: b.fulfilledAt?.toISOString() ?? null,
            })),
          })),
        }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
