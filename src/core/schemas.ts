import { z } from 'zod'

export const errorSchema = z.object({
  error: z.string(),
})

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['REP', 'MANAGER', 'FINANCE', 'ADMIN', 'CUSTOMER']),
  name: z.string(),
  createdAt: z.string().datetime(),
})

export const authTokenSchema = z.object({
  token: z.string(),
  user: userSchema,
})

export const signupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['REP', 'MANAGER', 'FINANCE', 'ADMIN']),
})

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  unitPrice: z.union([z.number(), z.string()]),
  description: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
})

export const createProductBodySchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  unitPrice: z.number().positive(),
  description: z.string().optional(),
})

export const ceilingSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  customerTier: z.string(),
  ceilingPercent: z.number(),
})

export const upsertCeilingBodySchema = z.object({
  category: z.string().min(1),
  customerTier: z.string().min(1),
  ceilingPercent: z.number().min(0).max(100),
})

export const approvalChainRuleSchema = z.object({
  id: z.string().uuid(),
  minRiskScore: z.number(),
  maxRiskScore: z.number(),
  requiredApprovers: z.array(z.string()),
})

export const createApprovalChainBodySchema = z.object({
  minRiskScore: z.number().min(0),
  maxRiskScore: z.number().min(0),
  requiredApprovers: z.array(z.string().min(1)).min(1),
})

export const createQuoteBodySchema = z.object({
  customerId: z.string().uuid(),
})

export const addLineBodySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  discountPercent: z.number().min(0).max(100),
})

export const decideApprovalBodySchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
  reason: z.string().min(1),
})

export const quoteIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const approvalIdParamSchema = z.object({
  id: z.string().uuid(),
  approvalId: z.string().uuid(),
})

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
})

export const listQuotesQuerySchema = z.object({
  status: z
    .enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CONFIRMED'])
    .optional(),
  repUserId: z.string().uuid().optional(),
})

export const eventSchema = z.object({
  id: z.string().uuid(),
  aggregateId: z.string(),
  aggregateType: z.string(),
  type: z.string(),
  payload: z.unknown(),
  actorUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
})
