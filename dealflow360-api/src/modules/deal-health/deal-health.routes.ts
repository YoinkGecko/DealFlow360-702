import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { errorSchema, quoteStatusSchema } from '../../core/schemas.js'
import { handleRouteError } from '../../core/errors.js'
import * as dealHealthService from './deal-health.service.js'

const anomalySchema = z.object({
  quoteId: z.string().uuid(),
  lineId: z.string().uuid(),
  discountPercent: z.number(),
  zScore: z.number(),
  repName: z.string(),
})

const stalledQuoteSchema = z.object({
  quoteId: z.string().uuid(),
  currentStatus: quoteStatusSchema,
  dwellDays: z.number(),
  threshold: z.number(),
  isStalled: z.boolean(),
})

const thresholdSchema = z.object({
  status: quoteStatusSchema,
  thresholdDays: z.number(),
  sampleSize: z.number().int(),
  usingFallback: z.boolean(),
  fallbackDays: z.number(),
})

export async function dealHealthRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/deal-health/anomalies',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Deal Health'],
        description:
          'Discount anomalies on open quotes (DRAFT / PENDING_APPROVAL) — only non-final quotes are actionable for intervention',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ anomalies: z.array(anomalySchema) }),
        },
      },
    },
    async () => {
      const anomalies = await dealHealthService.getDiscountAnomalies()
      return { anomalies }
    },
  )

  server.get(
    '/deal-health/stalled',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Deal Health'],
        description: 'Stall detection for quotes in non-terminal statuses, stalled first',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ quotes: z.array(stalledQuoteSchema) }),
        },
      },
    },
    async () => {
      const quotes = await dealHealthService.getStalledQuotes()
      return { quotes }
    },
  )

  server.get(
    '/deal-health/thresholds',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Deal Health'],
        description: 'Computed stall thresholds per status with sample sizes (transparency)',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ thresholds: z.array(thresholdSchema) }),
        },
      },
    },
    async () => {
      const thresholds = await dealHealthService.getStageThresholds()
      return { thresholds }
    },
  )
}
