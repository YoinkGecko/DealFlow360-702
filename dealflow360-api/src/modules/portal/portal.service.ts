import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { ChangeRequestStatus, ChangeRequestType } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { appendEvent } from '../../core/event-store.js'
import {
  applyApprovalRouting,
  requiresHigherApproval,
  routeForRiskScore,
} from '../policy/approval-routing.js'
import {
  emitQuoteConfirmed,
  getQuoteDetail,
  recomputeQuoteRisk,
} from '../quotes/quotes.service.js'
import { buildPortalMagicLink, sendQuotationPortalEmail } from './portal-auth.js'
import { createNotification } from '../notifications/notifications.service.js'

const PORTAL_TOKEN_TTL_MS = 2 * 60 * 60 * 1000

export interface PortalTokenPayload {
  type: 'portal'
  customerId: string
  quoteId: string
}

function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === 'number' ? value : value.toNumber()
}

export async function requestPortalAccess(
  app: FastifyInstance,
  quoteId: string,
  customerEmail: string,
  actorUserId: string,
) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: { include: { tier: true } },
      lines: { include: { product: true } },
    },
  })

  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  if (quote.customer.email.toLowerCase() !== customerEmail.toLowerCase()) {
    throw Object.assign(new Error('Email does not match quote customer'), { statusCode: 403 })
  }

  if (quote.status !== 'APPROVED' && quote.status !== 'SENT' && quote.status !== 'UNDER_NEGOTIATION') {
    throw Object.assign(
      new Error('Quote must be APPROVED before sending to the customer portal'),
      { statusCode: 400 },
    )
  }

  if (quote.lines.length === 0) {
    throw Object.assign(new Error('Cannot send quote with no line items'), { statusCode: 400 })
  }

  const rep = await prisma.user.findUnique({ where: { id: quote.repUserId } })

  const expiresAt = new Date(Date.now() + PORTAL_TOKEN_TTL_MS)
  const token = app.jwt.sign(
    {
      type: 'portal',
      customerId: quote.customerId,
      quoteId: quote.id,
    },
    { expiresIn: '2h' },
  )

  await prisma.portalSession.create({
    data: {
      customerId: quote.customerId,
      quoteId: quote.id,
      token,
      expiresAt,
    },
  })

  if (quote.status === 'APPROVED') {
    await appendEvent({
      aggregateId: quoteId,
      aggregateType: 'Quote',
      type: 'QuoteSent',
      payload: { sentAt: new Date().toISOString(), customerEmail },
      actorUserId,
    })
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'SENT' },
    })
  }

  const link = buildPortalMagicLink(token)
  const quoteRef = quote.id.slice(0, 8).toUpperCase()
  const totalAmount = quote.lines.reduce(
    (sum, line) => sum + decimalToNumber(line.lineValue),
    0,
  )
  const validUntil = new Date(quote.createdAt)
  validUntil.setDate(validUntil.getDate() + 30)

  const emailSent = await sendQuotationPortalEmail(customerEmail, {
    customerName: quote.customer.name,
    lines: quote.lines.map((line) => ({
      productName: line.product.name,
      quantity: line.quantity,
      amount: decimalToNumber(line.lineValue),
    })),
    totalAmount,
    validUntil: validUntil.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    salesRepName: rep?.name ?? 'Your Sales Representative',
    companyName: process.env.COMPANY_NAME ?? 'Acme Sales India Pvt Ltd',
    phone: process.env.COMPANY_PHONE ?? '+91 98765 43210',
    email: rep?.email ?? process.env.SMTP_USER ?? 'sales@dealflow360.test',
    portalLink: link,
    quoteRef,
  })

  await createNotification({
    userId: quote.repUserId,
    quoteId: quote.id,
    message: emailSent
      ? `Quotation emailed to ${quote.customer.name} (${customerEmail})`
      : `Portal link created for ${quote.customer.name} — email not sent (check SMTP config)`,
  })

  const baseResponse = {
    linkSentTo: customerEmail,
    expiresAt: expiresAt.toISOString(),
    quoteId: quote.id,
    emailSent,
  }

  if (emailSent) {
    return {
      ...baseResponse,
      message: 'Quotation sent to customer email with portal link.',
    }
  }

  console.log('[portal] Magic link (SMTP not configured or send failed):', link)
  console.log('[portal] Raw token for API routes:', token)

  return {
    ...baseResponse,
    token,
    link,
      message:
      'SMTP not configured or send failed — magic link logged to console and returned in response for local testing.',
  }
}

export async function verifyPortalToken(app: FastifyInstance, token: string) {
  let payload: PortalTokenPayload
  try {
    payload = app.jwt.verify(token) as PortalTokenPayload
  } catch {
    throw Object.assign(new Error('Invalid or expired portal token'), { statusCode: 401 })
  }

  if (payload.type !== 'portal' || !payload.quoteId || !payload.customerId) {
    throw Object.assign(new Error('Invalid portal token'), { statusCode: 401 })
  }

  const session = await prisma.portalSession.findUnique({ where: { token } })
  if (!session) {
    throw Object.assign(new Error('Portal session not found'), { statusCode: 401 })
  }
  if (session.expiresAt < new Date()) {
    throw Object.assign(new Error('Portal token expired'), { statusCode: 401 })
  }
  if (session.quoteId !== payload.quoteId || session.customerId !== payload.customerId) {
    throw Object.assign(new Error('Portal token scope mismatch'), { statusCode: 401 })
  }

  return { session, payload }
}

export async function markPortalSessionUsed(sessionId: string) {
  await prisma.portalSession.update({
    where: { id: sessionId },
    data: { usedAt: new Date() },
  })
}

export async function getPortalQuoteView(app: FastifyInstance, token: string) {
  const { session, payload } = await verifyPortalToken(app, token)

  if (!session.usedAt) {
    await markPortalSessionUsed(session.id)
  }

  const quote = await prisma.quote.findUnique({
    where: { id: payload.quoteId },
    include: {
      lines: { include: { product: { select: { id: true, name: true, category: true } } } },
      customer: { include: { tier: { select: { name: true } } } },
    },
  })

  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  return {
    id: quote.id,
    status: quote.status,
    blendedRiskScore: quote.blendedRiskScore,
    customerName: quote.customer.name,
    tier: quote.customer.tier.name,
    lines: quote.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.product.name,
      category: line.product.category,
      quantity: line.quantity,
      unitPrice: decimalToNumber(line.unitPrice),
      discountPercent: line.discountPercent,
      lineValue: decimalToNumber(line.lineValue),
    })),
  }
}

export async function submitChangeRequest(
  app: FastifyInstance,
  token: string,
  data: {
    quoteLineId?: string
    type: ChangeRequestType
    proposedDiscountPercent?: number
    message?: string
  },
) {
  const { payload } = await verifyPortalToken(app, token)

  const quote = await prisma.quote.findUnique({ where: { id: payload.quoteId } })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  if (data.type === 'COUNTER_DISCOUNT') {
    if (!data.quoteLineId || data.proposedDiscountPercent === undefined) {
      throw Object.assign(
        new Error('COUNTER_DISCOUNT requires quoteLineId and proposedDiscountPercent'),
        { statusCode: 400 },
      )
    }
  }

  const changeRequest = await prisma.changeRequest.create({
    data: {
      id: randomUUID(),
      quoteId: payload.quoteId,
      quoteLineId: data.quoteLineId ?? null,
      type: data.type,
      proposedDiscountPercent: data.proposedDiscountPercent ?? null,
      message: data.message ?? null,
      status: 'PENDING',
    },
  })

  if (quote.status !== 'UNDER_NEGOTIATION') {
    await prisma.quote.update({
      where: { id: payload.quoteId },
      data: { status: 'UNDER_NEGOTIATION' },
    })
  }

  await appendEvent({
    aggregateId: payload.quoteId,
    aggregateType: 'Quote',
    type: 'ChangeRequestSubmitted',
    payload: {
      changeRequestId: changeRequest.id,
      type: data.type,
      quoteLineId: data.quoteLineId,
      proposedDiscountPercent: data.proposedDiscountPercent,
      message: data.message,
    },
    actorUserId: null,
  })

  const quoteWithRep = await prisma.quote.findUnique({
    where: { id: payload.quoteId },
    select: { repUserId: true, customer: { select: { name: true } } },
  })
  if (quoteWithRep) {
    await createNotification({
      userId: quoteWithRep.repUserId,
      quoteId: payload.quoteId,
      message: `${quoteWithRep.customer.name} submitted a ${data.type.replace(/_/g, ' ').toLowerCase()} on the portal`,
    })
  }

  return changeRequest
}

export async function listPortalChangeRequests(app: FastifyInstance, token: string) {
  const { payload } = await verifyPortalToken(app, token)

  const requests = await prisma.changeRequest.findMany({
    where: { quoteId: payload.quoteId },
    orderBy: { createdAt: 'desc' },
  })

  return requests.map(serializeChangeRequest)
}

export async function listQuoteChangeRequests(quoteId: string) {
  const requests = await prisma.changeRequest.findMany({
    where: { quoteId },
    orderBy: { createdAt: 'asc' },
  })
  return requests.map(serializeChangeRequest)
}

export async function respondToChangeRequest(
  quoteId: string,
  changeRequestId: string,
  data: { decision: ChangeRequestStatus; note?: string },
  actorUserId: string,
) {
  if (data.decision !== 'ACCEPTED' && data.decision !== 'REJECTED') {
    throw Object.assign(new Error('Decision must be ACCEPTED or REJECTED'), { statusCode: 400 })
  }

  const changeRequest = await prisma.changeRequest.findFirst({
    where: { id: changeRequestId, quoteId },
    include: { quoteLine: { include: { product: true } } },
  })

  if (!changeRequest) {
    throw Object.assign(new Error('Change request not found'), { statusCode: 404 })
  }
  if (changeRequest.status !== 'PENDING') {
    throw Object.assign(new Error('Change request already resolved'), { statusCode: 400 })
  }

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  const oldRisk = quote.blendedRiskScore ?? 0
  const oldChain = await routeForRiskScore(oldRisk)

  if (data.decision === 'REJECTED') {
    await prisma.changeRequest.update({
      where: { id: changeRequestId },
      data: { status: 'REJECTED', resolvedAt: new Date() },
    })

    await appendEvent({
      aggregateId: quoteId,
      aggregateType: 'Quote',
      type: 'ChangeRequestRejected',
      payload: {
        changeRequestId,
        note: data.note ?? null,
      },
      actorUserId,
    })

    return { changeRequestId, status: 'REJECTED' as const, quoteStatus: quote.status }
  }

  let newRisk = oldRisk
  let reenteredApproval = false

  if (changeRequest.type === 'COUNTER_DISCOUNT') {
    if (!changeRequest.quoteLine) {
      throw Object.assign(new Error('Quote line not found for counter-discount'), { statusCode: 400 })
    }
    const line = changeRequest.quoteLine
    const unitPrice = decimalToNumber(line.unitPrice)
    const newDiscount = changeRequest.proposedDiscountPercent!
    const newLineValue = unitPrice * line.quantity * (1 - newDiscount / 100)

    await appendEvent({
      aggregateId: quoteId,
      aggregateType: 'Quote',
      type: 'LineDiscountRevised',
      payload: {
        lineId: line.id,
        productId: line.productId,
        quantity: line.quantity,
        discountPercent: newDiscount,
        lineValue: newLineValue,
        previousDiscountPercent: line.discountPercent,
      },
      actorUserId,
    })

    await prisma.quoteLine.update({
      where: { id: line.id },
      data: {
        discountPercent: newDiscount,
        lineValue: newLineValue,
      },
    })

    newRisk = (await recomputeQuoteRisk(quoteId, actorUserId)) ?? 0
  }

  await prisma.changeRequest.update({
    where: { id: changeRequestId },
    data: { status: 'ACCEPTED', resolvedAt: new Date() },
  })

  const newChain = await routeForRiskScore(newRisk)

  if (changeRequest.type === 'COUNTER_DISCOUNT' && requiresHigherApproval(oldChain, newChain)) {
    await applyApprovalRouting(quoteId, newRisk, actorUserId, {
      approvalEventType: 'QuoteReenteredApproval',
    })
    reenteredApproval = true
  } else {
    await appendEvent({
      aggregateId: quoteId,
      aggregateType: 'Quote',
      type: 'ChangeRequestAccepted',
      payload: {
        changeRequestId,
        note: data.note ?? null,
        newBlendedRiskScore: newRisk,
      },
      actorUserId,
    })

    const pendingCount = await prisma.changeRequest.count({
      where: { quoteId, status: 'PENDING' },
    })

    if (pendingCount === 0 && newChain.length === 0) {
      await prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'APPROVED' },
      })
    }
  }

  const updatedQuote = await getQuoteDetail(quoteId)

  return {
    changeRequestId,
    status: 'ACCEPTED' as const,
    quoteStatus: updatedQuote.status,
    blendedRiskScore: updatedQuote.blendedRiskScore,
    reenteredApproval,
  }
}

export async function confirmQuoteFromPortal(app: FastifyInstance, token: string) {
  const { payload } = await verifyPortalToken(app, token)

  const pending = await prisma.changeRequest.count({
    where: { quoteId: payload.quoteId, status: 'PENDING' },
  })

  if (pending > 0) {
    throw Object.assign(
      new Error('Cannot confirm while change requests are still pending'),
      { statusCode: 400 },
    )
  }

  const quote = await prisma.quote.findUnique({
    where: { id: payload.quoteId },
    include: { customer: { select: { name: true } } },
  })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  if (quote.status !== 'APPROVED' && quote.status !== 'SENT') {
    throw Object.assign(
      new Error('Quote must be APPROVED or SENT to confirm'),
      { statusCode: 400 },
    )
  }

  const updated = await emitQuoteConfirmed(payload.quoteId, null)

  await createNotification({
    userId: quote.repUserId,
    quoteId: payload.quoteId,
    message: `${quote.customer.name} confirmed the quotation via the customer portal`,
  })

  return {
    quoteId: updated.id,
    status: updated.status,
  }
}

function serializeChangeRequest(request: {
  id: string
  quoteId: string
  quoteLineId: string | null
  type: ChangeRequestType
  proposedDiscountPercent: number | null
  message: string | null
  status: ChangeRequestStatus
  createdAt: Date
  resolvedAt: Date | null
}) {
  return {
    id: request.id,
    quoteId: request.quoteId,
    quoteLineId: request.quoteLineId,
    type: request.type,
    proposedDiscountPercent: request.proposedDiscountPercent,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    resolvedAt: request.resolvedAt?.toISOString() ?? null,
  }
}
