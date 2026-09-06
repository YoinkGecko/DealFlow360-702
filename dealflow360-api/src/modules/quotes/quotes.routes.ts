import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  addLineBodySchema,
  approvalDecisionSchema,
  approvalIdParamSchema,
  changeRequestIdParamSchema,
  changeRequestStatusSchema,
  changeRequestTypeSchema,
  createQuoteBodySchema,
  decideApprovalBodySchema,
  errorSchema,
  listQuotesQuerySchema,
  quoteIdParamSchema,
  quoteLineIdParamSchema,
  quoteStatusSchema,
  respondChangeRequestBodySchema,
  updateLineBodySchema,
} from '../../core/schemas.js'
import { getAuthUser, requireRoles } from '../../core/auth-middleware.js'
import { handleRouteError } from '../../core/errors.js'
import * as quotesService from './quotes.service.js'
import * as portalService from '../portal/portal.service.js'

const quoteLineSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number(),
  unitPrice: z.number(),
  discountPercent: z.number(),
  lineValue: z.number(),
  product: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      category: z.string(),
    })
    .optional(),
})

const approvalSchema = z.object({
  id: z.string().uuid(),
  approverRole: z.enum(['MANAGER', 'FINANCE', 'ADMIN', 'REP']),
  decision: approvalDecisionSchema,
  reason: z.string().nullable(),
  decidedAt: z.string().datetime().nullable(),
  sortOrder: z.number(),
})

const quoteDetailSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  repUserId: z.string().uuid(),
  status: quoteStatusSchema,
  blendedRiskScore: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lines: z.array(quoteLineSchema),
  approvals: z.array(approvalSchema),
  customer: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      tier: z.object({ name: z.string() }),
    })
    .optional(),
})

export async function quotesRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.post(
    '/quotes',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        body: createQuoteBodySchema,
        response: { 201: quoteDetailSchema, 403: errorSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const quote = await quotesService.createQuote(user.sub, request.body.customerId)
        const detail = await quotesService.getQuoteDetail(quote.id)
        return reply.status(201).send(serializeQuote(detail))
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.get(
    '/quotes',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        querystring: listQuotesQuerySchema,
        response: {
          200: z.object({
            items: z.array(quoteDetailSchema),
            total: z.number().int(),
            page: z.number().int(),
            limit: z.number().int(),
            pageCount: z.number().int(),
          }),
        },
      },
    },
    async (request) => {
      const result = await quotesService.listQuotes(request.query)
      return {
        ...result,
        items: result.items.map(serializeQuote),
      }
    },
  )

  server.get(
    '/quotes/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: { 200: quoteDetailSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const quote = await quotesService.getQuoteDetail(request.params.id)
        return serializeQuote(quote)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/quotes/:id/lines',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        body: addLineBodySchema,
        response: {
          201: z.object({
            line: quoteLineSchema,
            blendedRiskScore: z.number().nullable(),
          }),
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const result = await quotesService.addQuoteLine(
          request.params.id,
          request.body,
          user.sub,
        )
        return reply.status(201).send({
          line: serializeLine(result.line),
          blendedRiskScore: result.blendedRiskScore,
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.patch(
    '/quotes/:id/lines/:lineId',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Quotes'],
        description: 'Edit an existing quote line (DRAFT only). Recomputes blended risk score.',
        security: [{ bearerAuth: [] }],
        params: quoteLineIdParamSchema,
        body: updateLineBodySchema,
        response: {
          200: z.object({
            line: quoteLineSchema,
            blendedRiskScore: z.number().nullable(),
          }),
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const result = await quotesService.updateQuoteLine(
          request.params.id,
          request.params.lineId,
          request.body,
          user.sub,
        )
        return {
          line: serializeLine(result.line),
          blendedRiskScore: result.blendedRiskScore,
        }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/quotes/:id/submit',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: {
          200: z.object({
            quote: quoteDetailSchema,
            autoApproved: z.boolean(),
            approvals: z.array(approvalSchema),
          }),
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const result = await quotesService.submitQuoteForApproval(request.params.id, user.sub)
        const detail = await quotesService.getQuoteDetail(request.params.id)
        return {
          quote: serializeQuote(detail),
          autoApproved: result.autoApproved,
          approvals: detail.approvals.map(serializeApproval),
        }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/quotes/:id/approvals/:approvalId/decide',
    {
      onRequest: [app.authenticate, requireRoles('MANAGER', 'FINANCE', 'ADMIN')],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        params: approvalIdParamSchema,
        body: decideApprovalBodySchema,
        response: {
          200: z.object({
            approval: approvalSchema,
            quoteStatus: quoteStatusSchema,
          }),
          400: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        const result = await quotesService.decideApproval(
          request.params.id,
          request.params.approvalId,
          request.body,
          { userId: user.sub, role: user.role },
        )
        return {
          approval: serializeApproval(result.approval),
          quoteStatus: result.quoteStatus,
        }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/quotes/:id/send',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Quotes'],
        description: 'Send an approved quote to the customer portal (status → SENT)',
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: {
          200: quoteDetailSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        await quotesService.sendQuoteToCustomer(request.params.id, user.sub)
        const detail = await quotesService.getQuoteDetail(request.params.id)
        return serializeQuote(detail)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.get(
    '/quotes/:id/change-requests',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: {
          200: z.object({
            changeRequests: z.array(
              z.object({
                id: z.string().uuid(),
                quoteId: z.string().uuid(),
                quoteLineId: z.string().uuid().nullable(),
                type: changeRequestTypeSchema,
                proposedDiscountPercent: z.number().nullable(),
                message: z.string().nullable(),
                status: changeRequestStatusSchema,
                createdAt: z.string().datetime(),
                resolvedAt: z.string().datetime().nullable(),
              }),
            ),
          }),
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const changeRequests = await portalService.listQuoteChangeRequests(request.params.id)
        return { changeRequests }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/quotes/:id/change-requests/:reqId/respond',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN')],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        params: changeRequestIdParamSchema,
        body: respondChangeRequestBodySchema,
        response: {
          200: z.object({
            changeRequestId: z.string().uuid(),
            status: changeRequestStatusSchema,
            quoteStatus: quoteStatusSchema,
            blendedRiskScore: z.number().nullable().optional(),
            reenteredApproval: z.boolean().optional(),
          }),
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        return await portalService.respondToChangeRequest(
          request.params.id,
          request.params.reqId,
          request.body,
          user.sub,
        )
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/quotes/:id/confirm',
    {
      onRequest: [app.authenticate, requireRoles('REP', 'ADMIN', 'CUSTOMER')],
      schema: {
        tags: ['Quotes'],
        security: [{ bearerAuth: [] }],
        params: quoteIdParamSchema,
        response: {
          200: quoteDetailSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        await quotesService.confirmQuote(request.params.id, user.sub)
        const detail = await quotesService.getQuoteDetail(request.params.id)
        return serializeQuote(detail)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}

function serializeQuote(quote: Awaited<ReturnType<typeof quotesService.getQuoteDetail>>) {
  return {
    id: quote.id,
    customerId: quote.customerId,
    repUserId: quote.repUserId,
    status: quote.status,
    blendedRiskScore: quote.blendedRiskScore,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    lines: quote.lines.map(serializeLine),
    approvals: quote.approvals.map(serializeApproval),
    customer: quote.customer
      ? {
          id: quote.customer.id,
          name: quote.customer.name,
          email: quote.customer.email,
          tier: { name: quote.customer.tier.name },
        }
      : undefined,
  }
}

function serializeLine(line: {
  id: string
  productId: string
  quantity: number
  unitPrice: { toNumber(): number } | number
  discountPercent: number
  lineValue: { toNumber(): number } | number
  product?: { id: string; name: string; category: string }
}) {
  return {
    id: line.id,
    productId: line.productId,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    discountPercent: line.discountPercent,
    lineValue: Number(line.lineValue),
    product: line.product
      ? { id: line.product.id, name: line.product.name, category: line.product.category }
      : undefined,
  }
}

function serializeApproval(approval: {
  id: string
  approverRole: string
  decision: string
  reason: string | null
  decidedAt: Date | null
  sortOrder: number
}) {
  return {
    id: approval.id,
    approverRole: approval.approverRole as 'MANAGER' | 'FINANCE' | 'ADMIN' | 'REP',
    decision: approval.decision as 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
    reason: approval.reason,
    decidedAt: approval.decidedAt?.toISOString() ?? null,
    sortOrder: approval.sortOrder,
  }
}
