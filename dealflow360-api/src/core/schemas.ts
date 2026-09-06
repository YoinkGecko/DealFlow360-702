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

export const updateLineBodySchema = z
  .object({
    quantity: z.number().int().positive().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
  })
  .refine((data) => data.quantity !== undefined || data.discountPercent !== undefined, {
    message: 'At least one of quantity or discountPercent is required',
  })

export const quoteLineIdParamSchema = z.object({
  id: z.string().uuid(),
  lineId: z.string().uuid(),
})

export const quoteStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'UNDER_NEGOTIATION',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CONFIRMED',
])

export const approvalDecisionSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVISION_REQUESTED',
])

export const changeRequestTypeSchema = z.enum(['COMMENT', 'COUNTER_DISCOUNT', 'GENERAL_CHANGE'])

export const changeRequestStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED'])

export const subscriptionStatusSchema = z.enum(['ACTIVE', 'CANCELLED'])

export const ledgerLineTypeSchema = z.enum([
  'ONE_TIME_CHARGE',
  'RECURRING_CHARGE',
  'PRORATED_CHARGE',
  'CREDIT',
])

export const createCustomerBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  customerTierId: z.string().uuid(),
})

export const customerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  customerTierId: z.string().uuid(),
  tier: z.object({ id: z.string().uuid(), name: z.string() }),
  createdAt: z.string().datetime(),
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

export const subscriptionIdParamSchema = z.object({
  id: z.string().uuid(),
  subId: z.string().uuid(),
})

export const addSubscriptionBodySchema = z.object({
  planId: z.string().uuid(),
  quantity: z.number().int().positive(),
})

export const changeSubscriptionQuantityBodySchema = z.object({
  newQuantity: z.number().int().positive(),
})

export const listQuotesQuerySchema = z.object({
  status: quoteStatusSchema.optional(),
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

export const replayQuoteBodySchema = z.object({
  hypotheticalCeilings: z
    .array(
      z.object({
        category: z.string().min(1),
        customerTier: z.string().min(1),
        ceilingPercent: z.number().min(0).max(100),
      }),
    )
    .optional(),
})

export const portalRequestAccessBodySchema = z.object({
  quoteId: z.string().uuid(),
  customerEmail: z.string().email(),
})

export const portalTokenParamSchema = z.object({
  token: z.string().min(1),
})

export const portalChangeRequestBodySchema = z.object({
  quoteLineId: z.string().uuid().optional(),
  type: z.enum(['COMMENT', 'COUNTER_DISCOUNT', 'GENERAL_CHANGE']),
  proposedDiscountPercent: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
})

export const changeRequestIdParamSchema = z.object({
  id: z.string().uuid(),
  reqId: z.string().uuid(),
})

export const respondChangeRequestBodySchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  note: z.string().optional(),
})
