import { randomUUID } from 'node:crypto'
import type { ApprovalDecision, QuoteStatus, UserRole } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { paginateParams, paginatedResult } from '../../core/pagination.js'
import { appendEvent } from '../../core/event-store.js'
import {
  computeQuoteBlendedRisk,
} from '../policy/policy.service.js'
import { applyApprovalRouting } from '../policy/approval-routing.js'
import { getProductById } from '../catalog/catalog.service.js'

function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === 'number' ? value : value.toNumber()
}

async function getCustomerTierName(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { tier: true },
  })
  if (!customer) {
    throw Object.assign(new Error('Customer not found'), { statusCode: 404 })
  }
  return customer.tier.name
}

async function recomputeAndPersistRisk(quoteId: string, actorUserId?: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lines: { include: { product: true } },
      customer: { include: { tier: true } },
    },
  })
  if (!quote) return null

  const riskLines = quote.lines.map((line) => ({
    discountPercent: line.discountPercent,
    lineValue: decimalToNumber(line.lineValue),
    category: line.product.category,
  }))

  const blendedRisk = await computeQuoteBlendedRisk(
    riskLines,
    quote.customer.tier.name,
  )

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'RiskScoreComputed',
    payload: { blendedRiskScore: blendedRisk, lineCount: quote.lines.length },
    actorUserId: actorUserId ?? null,
  })

  await prisma.quote.update({
    where: { id: quoteId },
    data: { blendedRiskScore: blendedRisk },
  })

  return blendedRisk
}

export async function createQuote(repUserId: string, customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    throw Object.assign(new Error('Customer not found'), { statusCode: 404 })
  }

  const quoteId = randomUUID()

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'QuoteCreated',
    payload: { customerId, repUserId },
    actorUserId: repUserId,
  })

  const quote = await prisma.quote.create({
    data: {
      id: quoteId,
      customerId,
      repUserId,
      status: 'DRAFT',
      blendedRiskScore: 0,
    },
  })

  return quote
}

export async function addQuoteLine(
  quoteId: string,
  data: { productId: string; quantity: number; discountPercent: number },
  actorUserId: string,
) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }
  if (quote.status !== 'DRAFT' && quote.status !== 'REJECTED') {
    throw Object.assign(new Error('Quote cannot be modified in current status'), {
      statusCode: 400,
    })
  }

  const product = await getProductById(data.productId)
  const unitPrice = decimalToNumber(product.unitPrice)
  const lineValue = unitPrice * data.quantity * (1 - data.discountPercent / 100)
  const lineId = randomUUID()

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'LineAdded',
    payload: {
      lineId,
      productId: data.productId,
      quantity: data.quantity,
      discountPercent: data.discountPercent,
      lineValue,
    },
    actorUserId,
  })

  const line = await prisma.quoteLine.create({
    data: {
      id: lineId,
      quoteId,
      productId: data.productId,
      quantity: data.quantity,
      unitPrice,
      discountPercent: data.discountPercent,
      lineValue,
    },
    include: { product: true },
  })

  const blendedRisk = await recomputeAndPersistRisk(quoteId, actorUserId)

  return { line, blendedRiskScore: blendedRisk }
}

export async function updateQuoteLine(
  quoteId: string,
  lineId: string,
  data: { quantity?: number; discountPercent?: number },
  actorUserId: string,
) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }
  if (quote.status !== 'DRAFT') {
    throw Object.assign(new Error('Quote lines can only be edited while status is DRAFT'), {
      statusCode: 400,
    })
  }

  const existingLine = await prisma.quoteLine.findFirst({
    where: { id: lineId, quoteId },
    include: { product: true },
  })
  if (!existingLine) {
    throw Object.assign(new Error('Quote line not found'), { statusCode: 404 })
  }

  const quantity = data.quantity ?? existingLine.quantity
  const discountPercent = data.discountPercent ?? existingLine.discountPercent
  const unitPrice = decimalToNumber(existingLine.unitPrice)
  const lineValue = unitPrice * quantity * (1 - discountPercent / 100)

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'LineUpdated',
    payload: {
      lineId,
      quantity,
      discountPercent,
      lineValue,
    },
    actorUserId,
  })

  const line = await prisma.quoteLine.update({
    where: { id: lineId },
    data: {
      quantity,
      discountPercent,
      lineValue,
    },
    include: { product: true },
  })

  const blendedRiskScore = await recomputeAndPersistRisk(quoteId, actorUserId)

  return { line, blendedRiskScore }
}

export async function getQuoteDetail(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lines: { include: { product: true } },
      approvals: { orderBy: { sortOrder: 'asc' } },
      customer: { include: { tier: true } },
    },
  })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }
  return quote
}

export async function listQuotes(filters: {
  status?: QuoteStatus
  repUserId?: string
  page?: number
  limit?: number
  search?: string
}) {
  const { skip, take, page, limit } = paginateParams(filters.page, filters.limit)

  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.repUserId ? { repUserId: filters.repUserId } : {}),
    ...(filters.search
      ? {
          customer: {
            name: { contains: filters.search, mode: 'insensitive' as const },
          },
        }
      : {}),
  }

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        customer: { include: { tier: true } },
        lines: { include: { product: true } },
        approvals: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.quote.count({ where }),
  ])

  return paginatedResult(quotes, total, page, limit)
}

export async function submitQuoteForApproval(quoteId: string, actorUserId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: true },
  })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }
  if (quote.lines.length === 0) {
    throw Object.assign(new Error('Cannot submit quote with no lines'), { statusCode: 400 })
  }

  const blendedRisk = quote.blendedRiskScore ?? 0
  const result = await applyApprovalRouting(quoteId, blendedRisk, actorUserId, {
    approvalEventType: 'ApprovalRequested',
  })

  return result
}

export async function decideApproval(
  quoteId: string,
  approvalId: string,
  data: { decision: ApprovalDecision; reason: string },
  actor: { userId: string; role: UserRole },
) {
  if (!data.reason?.trim()) {
    throw Object.assign(new Error('Reason is required'), { statusCode: 400 })
  }

  const approval = await prisma.approval.findFirst({
    where: { id: approvalId, quoteId },
  })
  if (!approval) {
    throw Object.assign(new Error('Approval not found'), { statusCode: 404 })
  }
  if (approval.decision !== 'PENDING') {
    throw Object.assign(new Error('Approval already decided'), { statusCode: 400 })
  }

  const roleMatches =
    approval.approverRole === actor.role ||
    (approval.approverRole === 'MANAGER' && actor.role === 'ADMIN') ||
    (approval.approverRole === 'FINANCE' && actor.role === 'ADMIN')

  if (!roleMatches) {
    throw Object.assign(new Error('You are not authorized to decide this approval'), {
      statusCode: 403,
    })
  }

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'ApprovalDecided',
    payload: {
      approvalId,
      decision: data.decision,
      reason: data.reason,
      approverRole: approval.approverRole,
    },
    actorUserId: actor.userId,
  })

  const updatedApproval = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      decision: data.decision,
      reason: data.reason,
      approverUserId: actor.userId,
      decidedAt: new Date(),
    },
  })

  if (data.decision === 'REJECTED' || data.decision === 'REVISION_REQUESTED') {
    const newStatus: QuoteStatus =
      data.decision === 'REJECTED' ? 'REJECTED' : 'DRAFT'
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: newStatus },
    })
    return { approval: updatedApproval, quoteStatus: newStatus }
  }

  const pending = await prisma.approval.count({
    where: { quoteId, decision: 'PENDING' },
  })

  if (pending === 0) {
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'APPROVED' },
    })
    return { approval: updatedApproval, quoteStatus: 'APPROVED' as QuoteStatus }
  }

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  return { approval: updatedApproval, quoteStatus: quote!.status }
}

export async function emitQuoteConfirmed(quoteId: string, actorUserId?: string | null) {
  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'QuoteConfirmed',
    payload: { confirmedAt: new Date().toISOString(), source: actorUserId ? 'internal' : 'portal' },
    actorUserId: actorUserId ?? null,
  })

  return prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'CONFIRMED' },
  })
}

export async function confirmQuote(quoteId: string, actorUserId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }
  if (quote.status !== 'APPROVED') {
    throw Object.assign(new Error('Only APPROVED quotes can be confirmed'), { statusCode: 400 })
  }

  return emitQuoteConfirmed(quoteId, actorUserId)
}

export async function sendQuoteToCustomer(quoteId: string, actorUserId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: true },
  })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }
  if (quote.status !== 'APPROVED') {
    throw Object.assign(new Error('Quote must be APPROVED before sending to customer'), {
      statusCode: 400,
    })
  }
  if (quote.lines.length === 0) {
    throw Object.assign(new Error('Cannot send quote with no lines'), { statusCode: 400 })
  }

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'QuoteSent',
    payload: { sentAt: new Date().toISOString() },
    actorUserId,
  })

  return prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'SENT' },
  })
}

export async function recomputeQuoteRisk(quoteId: string, actorUserId?: string | null) {
  return recomputeAndPersistRisk(quoteId, actorUserId ?? undefined)
}
