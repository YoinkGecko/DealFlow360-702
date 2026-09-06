import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  approvalChainRuleSchema,
  ceilingSchema,
  createApprovalChainBodySchema,
  errorSchema,
  upsertCeilingBodySchema,
} from '../../core/schemas.js'
import { requireRoles } from '../../core/auth-middleware.js'
import * as policyService from './policy.service.js'

export async function policyRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/policy/ceilings',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Policy'],
        description: 'All category/tier discount ceilings — config that drives risk scoring',
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(ceilingSchema) },
      },
    },
    async () => policyService.getAllCeilings(),
  )

  server.post(
    '/policy/ceilings',
    {
      onRequest: [app.authenticate, requireRoles('ADMIN')],
      schema: {
        tags: ['Policy'],
        security: [{ bearerAuth: [] }],
        body: upsertCeilingBodySchema,
        response: { 201: ceilingSchema, 403: errorSchema },
      },
    },
    async (request, reply) => {
      const ceiling = await policyService.upsertCeiling(request.body)
      return reply.status(201).send(ceiling)
    },
  )

  server.get(
    '/policy/approval-chains',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Policy'],
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(approvalChainRuleSchema) },
      },
    },
    async () => policyService.getAllApprovalChainRules(),
  )

  server.post(
    '/policy/approval-chains',
    {
      onRequest: [app.authenticate, requireRoles('ADMIN')],
      schema: {
        tags: ['Policy'],
        security: [{ bearerAuth: [] }],
        body: createApprovalChainBodySchema,
        response: { 201: approvalChainRuleSchema, 403: errorSchema },
      },
    },
    async (request, reply) => {
      const rule = await policyService.createApprovalChainRule(request.body)
      return reply.status(201).send(rule)
    },
  )
}
