import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  addLineBodySchema,
  approvalIdParamSchema,
  createQuoteBodySchema,
  decideApprovalBodySchema,
  errorSchema,
  listQuotesQuerySchema,
  quoteIdParamSchema,
} from '../../core/schemas.js'
import { getAuthUser, requireRoles } from '../../core/auth-middleware.js'
import { handleRouteError } from '../../core/errors.js'
import * as quotesService from './quotes.service.js'

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
  approverRole: z.string(),
  decision: z.string(),
  reason: z.string().nullable(),
  decidedAt: z.string().datetime().nullable(),
  sortOrder: z.number(),
})

const quoteDetailSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  repUserId: z.string().uuid(),
  status: z.string(),
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
        response: { 200: z.array(quoteDetailSchema) },
      },
    },
    async (request) => {
      const quotes = await quotesService.listQuotes(request.query)
      return quotes.map(serializeQuote)
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
            quoteStatus: z.string(),
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
    approverRole: approval.approverRole,
    decision: approval.decision,
    reason: approval.reason,
    decidedAt: approval.decidedAt?.toISOString() ?? null,
    sortOrder: approval.sortOrder,
  }
}
