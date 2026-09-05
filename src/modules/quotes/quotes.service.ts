import { randomUUID } from 'node:crypto'
import type { ApprovalDecision, QuoteStatus, UserRole } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { appendEvent } from '../../core/event-store.js'
import {
  computeQuoteBlendedRisk,
  resolveApprovalChain,
} from '../policy/policy.service.js'
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
}) {
  return prisma.quote.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.repUserId ? { repUserId: filters.repUserId } : {}),
    },
    include: {
      customer: { include: { tier: true } },
      lines: { include: { product: true } },
      approvals: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  })
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
  const requiredApprovers = await resolveApprovalChain(blendedRisk)

  if (requiredApprovers.length === 0) {
    await appendEvent({
      aggregateId: quoteId,
      aggregateType: 'Quote',
      type: 'QuoteAutoApproved',
      payload: { blendedRiskScore: blendedRisk, reason: 'No approval rule matched' },
      actorUserId,
    })

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'APPROVED' },
    })

    return { quote: updated, autoApproved: true, approvals: [] }
  }

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'ApprovalRequested',
    payload: {
      blendedRiskScore: blendedRisk,
      requiredApprovers,
    },
    actorUserId,
  })

  await prisma.approval.deleteMany({ where: { quoteId } })

  const approvals = await Promise.all(
    requiredApprovers.map((role, index) =>
      prisma.approval.create({
        data: {
          quoteId,
          approverRole: role,
          decision: 'PENDING',
          sortOrder: index,
        },
      }),
    ),
  )

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'PENDING_APPROVAL' },
  })

  return { quote: updated, autoApproved: false, approvals }
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
