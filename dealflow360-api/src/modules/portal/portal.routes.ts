import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  errorSchema,
  portalChangeRequestBodySchema,
  portalRequestAccessBodySchema,
  portalTokenParamSchema,
  quoteStatusSchema,
  changeRequestStatusSchema,
  changeRequestTypeSchema,
  respondChangeRequestBodySchema,
} from '../../core/schemas.js'
import { getAuthUser, requireRoles } from '../../core/auth-middleware.js'
import { handleRouteError } from '../../core/errors.js'
import * as portalService from './portal.service.js'

const portalQuoteViewSchema = z.object({
  id: z.string().uuid(),
  status: quoteStatusSchema,
  blendedRiskScore: z.number().nullable(),
  customerName: z.string(),
  tier: z.string(),
  lines: z.array(
    z.object({
      id: z.string().uuid(),
      productId: z.string().uuid(),
      productName: z.string(),
      category: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      discountPercent: z.number(),
      lineValue: z.number(),
    }),
  ),
})

const changeRequestSchema = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid(),
  quoteLineId: z.string().uuid().nullable(),
  type: changeRequestTypeSchema,
  proposedDiscountPercent: z.number().nullable(),
  message: z.string().nullable(),
  status: changeRequestStatusSchema,
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
})

export async function portalRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.post(
    '/portal/request-access',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Portal'],
        description:
          'Request customer portal access (Rep/Admin only). Sends magic-link email via SMTP when configured; otherwise returns link in response.',
        security: [{ bearerAuth: [] }],
        body: portalRequestAccessBodySchema,
        response: {
          200: z.object({
            linkSentTo: z.string().email(),
            expiresAt: z.string().datetime(),
            quoteId: z.string().uuid(),
            emailSent: z.boolean(),
            message: z.string(),
            token: z.string().optional(),
            link: z.string().url().optional(),
          }),
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const result = await portalService.requestPortalAccess(
          app,
          request.body.quoteId,
          request.body.customerEmail,
          user.sub,
        )
        return result
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.get(
    '/portal/quotes/:token',
    {
      schema: {
        tags: ['Portal'],
        description: 'Customer read-only quote view (marks portal session as used)',
        params: portalTokenParamSchema,
        response: { 200: portalQuoteViewSchema, 401: errorSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        return await portalService.getPortalQuoteView(app, request.params.token)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/portal/quotes/:token/change-requests',
    {
      schema: {
        tags: ['Portal'],
        params: portalTokenParamSchema,
        body: portalChangeRequestBodySchema,
        response: { 201: changeRequestSchema, 400: errorSchema, 401: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const result = await portalService.submitChangeRequest(app, request.params.token, request.body)
        return reply.status(201).send({
          id: result.id,
          quoteId: result.quoteId,
          quoteLineId: result.quoteLineId,
          type: result.type,
          proposedDiscountPercent: result.proposedDiscountPercent,
          message: result.message,
          status: result.status,
          createdAt: result.createdAt.toISOString(),
          resolvedAt: null,
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.get(
    '/portal/quotes/:token/change-requests',
    {
      schema: {
        tags: ['Portal'],
        params: portalTokenParamSchema,
        response: {
          200: z.object({ changeRequests: z.array(changeRequestSchema) }),
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const changeRequests = await portalService.listPortalChangeRequests(
          app,
          request.params.token,
        )
        return { changeRequests }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/portal/quotes/:token/confirm',
    {
      schema: {
        tags: ['Portal'],
        description: 'Customer confirms quote — emits QuoteConfirmed (same event as internal route)',
        params: portalTokenParamSchema,
        response: {
          200: z.object({ quoteId: z.string().uuid(), status: quoteStatusSchema }),
          400: errorSchema,
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await portalService.confirmQuoteFromPortal(app, request.params.token)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
