import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  createProductBodySchema,
  errorSchema,
  productIdParamSchema,
  productSchema,
} from '../../core/schemas.js'
import { requireRoles } from '../../core/auth-middleware.js'
import { handleRouteError } from '../../core/errors.js'
import * as catalogService from './catalog.service.js'

export async function catalogRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/products',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(productSchema),
        },
      },
    },
    async () => {
      const products = await catalogService.listProducts()
      return products.map(serializeProduct)
    },
  )

  server.post(
    '/products',
    {
      onRequest: [app.authenticate, requireRoles('ADMIN')],
      schema: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        body: createProductBodySchema,
        response: {
          201: productSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const product = await catalogService.createProduct(request.body)
      return reply.status(201).send(serializeProduct(product))
    },
  )

  server.get(
    '/price-lists/:productId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Catalog'],
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        response: {
          200: z.object({
            product: productSchema,
            entries: z.array(
              z.object({
                id: z.string().uuid(),
                productId: z.string().uuid(),
                customerTier: z.string(),
                price: z.union([z.number(), z.string()]),
                currency: z.string(),
              }),
            ),
          }),
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await catalogService.getPriceListForProduct(request.params.productId)
        return {
          product: serializeProduct(result.product),
          entries: result.entries.map((e) => ({
            ...e,
            price: Number(e.price),
          })),
        }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}

function serializeProduct(product: {
  id: string
  name: string
  category: string
  unitPrice: { toNumber(): number } | number
  description?: string | null
  createdAt?: Date
}) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    unitPrice: Number(product.unitPrice),
    description: product.description,
    createdAt: product.createdAt?.toISOString(),
  }
}
