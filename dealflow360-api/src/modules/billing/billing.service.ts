import { randomUUID } from 'node:crypto'
import type { LedgerLineType } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { appendEvent } from '../../core/event-store.js'
import { computeProratedCharge } from './proration.js'

function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === 'number' ? value : value.toNumber()
}

async function insertLedgerLine(data: {
  quoteId: string
  subscriptionId?: string | null
  type: LedgerLineType
  amount: number
  description: string
}) {
  return prisma.ledgerLine.create({
    data: {
      id: randomUUID(),
      quoteId: data.quoteId,
      subscriptionId: data.subscriptionId ?? null,
      type: data.type,
      amount: data.amount,
      description: data.description,
    },
  })
}

export async function addSubscriptionToQuote(
  quoteId: string,
  data: { planId: string; quantity: number },
  actorUserId: string,
) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } })
  if (!plan) {
    throw Object.assign(new Error('Subscription plan not found'), { statusCode: 404 })
  }

  if (data.quantity <= 0) {
    throw Object.assign(new Error('Quantity must be positive'), { statusCode: 400 })
  }

  const now = new Date()
  const cycleEnd = new Date(now)
  cycleEnd.setDate(cycleEnd.getDate() + plan.billingCycleDays)

  const unitPrice = decimalToNumber(plan.pricePerUnit)
  const amount = unitPrice * data.quantity

  const subscriptionId = randomUUID()

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'SubscriptionAdded',
    payload: {
      subscriptionId,
      planId: plan.id,
      planName: plan.name,
      quantity: data.quantity,
      cycleStartDate: now.toISOString(),
      cycleEndDate: cycleEnd.toISOString(),
      amount,
    },
    actorUserId,
  })

  const subscription = await prisma.subscription.create({
    data: {
      id: subscriptionId,
      quoteId,
      planId: plan.id,
      quantity: data.quantity,
      cycleStartDate: now,
      cycleEndDate: cycleEnd,
      status: 'ACTIVE',
    },
    include: { plan: true },
  })

  await insertLedgerLine({
    quoteId,
    subscriptionId: subscription.id,
    type: 'RECURRING_CHARGE',
    amount,
    description: `${plan.name} — ${data.quantity} unit(s) @ ₹${unitPrice}/cycle`,
  })

  return subscription
}

export async function changeSubscriptionQuantity(
  quoteId: string,
  subscriptionId: string,
  newQuantity: number,
  actorUserId: string,
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, quoteId },
    include: { plan: true },
  })

  if (!subscription) {
    throw Object.assign(new Error('Subscription not found'), { statusCode: 404 })
  }

  if (subscription.status !== 'ACTIVE') {
    throw Object.assign(new Error('Subscription is not active'), { statusCode: 400 })
  }

  if (newQuantity <= 0) {
    throw Object.assign(new Error('Quantity must be positive'), { statusCode: 400 })
  }

  const deltaQuantity = newQuantity - subscription.quantity
  if (deltaQuantity === 0) {
    throw Object.assign(new Error('Quantity unchanged'), { statusCode: 400 })
  }

  const unitPrice = decimalToNumber(subscription.plan.pricePerUnit)
  const changeDate = new Date()
  const proratedAmount = computeProratedCharge(
    unitPrice,
    deltaQuantity,
    subscription.cycleStartDate,
    subscription.cycleEndDate,
    changeDate,
  )

  const ledgerType: LedgerLineType = proratedAmount >= 0 ? 'PRORATED_CHARGE' : 'CREDIT'
  const description =
    deltaQuantity > 0
      ? `Prorated upgrade: +${deltaQuantity} unit(s) on ${subscription.plan.name}`
      : `Prorated downgrade: ${deltaQuantity} unit(s) on ${subscription.plan.name}`

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: 'SubscriptionQuantityChanged',
    payload: {
      subscriptionId,
      oldQuantity: subscription.quantity,
      newQuantity,
      deltaQuantity,
      proratedAmount,
      changeDate: changeDate.toISOString(),
    },
    actorUserId,
  })

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { quantity: newQuantity },
    include: { plan: true },
  })

  await insertLedgerLine({
    quoteId,
    subscriptionId,
    type: ledgerType,
    amount: proratedAmount,
    description,
  })

  return { subscription: updated, proratedAmount, ledgerType }
}

export async function getQuoteLedger(quoteId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) {
    throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
  }

  const lines = await prisma.ledgerLine.findMany({
    where: { quoteId },
    orderBy: { createdAt: 'asc' },
  })

  let runningTotal = 0
  const entries = lines.map((line) => {
    const amount = decimalToNumber(line.amount)
    runningTotal += amount
    return {
      id: line.id,
      quoteId: line.quoteId,
      subscriptionId: line.subscriptionId,
      type: line.type,
      amount,
      description: line.description,
      createdAt: line.createdAt.toISOString(),
      runningTotal,
    }
  })

  return {
    quoteId,
    entries,
    total: runningTotal,
  }
}

/** Phase 2 stub — one-time charges from QuoteLines are not yet mirrored to the ledger. */
export async function handleQuoteConfirmedBillingStub(_quoteId: string) {
  // Known gap: reconcile ONE_TIME_CHARGE ledger lines from quote lines in Phase 3.
}
