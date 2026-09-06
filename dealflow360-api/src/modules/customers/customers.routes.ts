import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  createCustomerBodySchema,
  customerSchema,
  errorSchema,
  paginationQuerySchema,
  paginatedMetaSchema,
} from '../../core/schemas.js'
import { requireRoles } from '../../core/auth-middleware.js'
import { handleRouteError } from '../../core/errors.js'
import * as customersService from './customers.service.js'

export async function customersRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/customers',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        querystring: paginationQuerySchema,
        response: {
          200: z.object({
            items: z.array(customerSchema),
            ...paginatedMetaSchema.shape,
          }),
        },
      },
    },
    async (request) => {
      const result = await customersService.listCustomers(request.query)
      return { ...result, items: result.items.map(serializeCustomer) }
    },
  )

  server.post(
    '/customers',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        body: createCustomerBodySchema,
        response: { 201: customerSchema, 403: errorSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const customer = await customersService.createCustomer(request.body)
        return reply.status(201).send(serializeCustomer(customer))
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}

function serializeCustomer(customer: {
  id: string
  name: string
  email: string
  customerTierId: string
  createdAt: Date
  tier: { id: string; name: string }
}) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    customerTierId: customer.customerTierId,
    tier: { id: customer.tier.id, name: customer.tier.name },
    createdAt: customer.createdAt.toISOString(),
  }
}
