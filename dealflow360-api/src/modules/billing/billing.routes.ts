import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  quoteIdParamSchema,
  subscriptionIdParamSchema,
  addSubscriptionBodySchema,
  changeSubscriptionQuantityBodySchema,
  errorSchema,
  subscriptionStatusSchema,
  ledgerLineTypeSchema,
} from '../../core/schemas.js'
import { getAuthUser, requireRoles } from '../../core/auth-middleware.js'
import { handleRouteError } from '../../core/errors.js'
import * as billingService from './billing.service.js'

const subscriptionSchema = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid(),
  planId: z.string().uuid(),
  quantity: z.number().int(),
  cycleStartDate: z.string().datetime(),
  cycleEndDate: z.string().datetime(),
  status: subscriptionStatusSchema,
  plan: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      billingCycleDays: z.number().int(),
      pricePerUnit: z.number(),
    })
    .optional(),
})

const ledgerEntrySchema = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable(),
  type: ledgerLineTypeSchema,
  amount: z.number(),
  description: z.string(),
  createdAt: z.string().datetime(),
  runningTotal: z.number(),
})

export async function billingRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.post(
    '/quotes/:id/subscriptions',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'FINANCE', 'ADMIN')],
      schema: {
        tags: ['Billing'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        body: addSubscriptionBodySchema,
        response: {
          201: subscriptionSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const subscription = await billingService.addSubscriptionToQuote(
          request.params.id,
          request.body,
          user.sub,
        )
        return reply.status(201).send(serializeSubscription(subscription))
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.patch(
    '/quotes/:id/subscriptions/:subId',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'FINANCE', 'ADMIN')],
      schema: {
        tags: ['Billing'],
        security: [{ bearerAuth: [] }],
        params: subscriptionIdParamSchema,
        body: changeSubscriptionQuantityBodySchema,
        response: {
          200: z.object({
            subscription: subscriptionSchema,
            proratedAmount: z.number(),
            ledgerType: ledgerLineTypeSchema,
          }),
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const result = await billingService.changeSubscriptionQuantity(
          request.params.id,
          request.params.subId,
          request.body.newQuantity,
          user.sub,
        )
        return {
          subscription: serializeSubscription(result.subscription),
          proratedAmount: result.proratedAmount,
          ledgerType: result.ledgerType,
        }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.get(
    '/quotes/:id/ledger',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Billing'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: {
          200: z.object({
            quoteId: z.string().uuid(),
            entries: z.array(ledgerEntrySchema),
            total: z.number(),
          }),
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await billingService.getQuoteLedger(request.params.id)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}

function serializeSubscription(subscription: {
  id: string
  quoteId: string
  planId: string
  quantity: number
  cycleStartDate: Date
  cycleEndDate: Date
  status: 'ACTIVE' | 'CANCELLED'
  plan?: {
    id: string
    name: string
    billingCycleDays: number
    pricePerUnit: { toNumber(): number } | number
  }
}) {
  return {
    id: subscription.id,
    quoteId: subscription.quoteId,
    planId: subscription.planId,
    quantity: subscription.quantity,
    cycleStartDate: subscription.cycleStartDate.toISOString(),
    cycleEndDate: subscription.cycleEndDate.toISOString(),
    status: subscription.status,
    plan: subscription.plan
      ? {
          id: subscription.plan.id,
          name: subscription.plan.name,
          billingCycleDays: subscription.plan.billingCycleDays,
          pricePerUnit: Number(subscription.plan.pricePerUnit),
        }
      : undefined,
  }
}
