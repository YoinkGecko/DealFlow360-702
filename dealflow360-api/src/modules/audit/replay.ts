import type { Event } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { getEventsForAggregate } from '../../core/event-store.js'
import { computeBlendedRisk, type RiskLineInput } from '../policy/risk-score.js'
import { loadPolicyConfig, resolveApprovalChain } from '../policy/policy.service.js'

export interface HypotheticalCeiling {
  category: string
  customerTier: string
  ceilingPercent: number
}

export interface ReplayLineUsed {
  lineId: string
  productId: string
  quantity: number
  discountPercent: number
  lineValue: number
  category: string
}

interface LineAddedPayload {
  lineId: string
  productId: string
  quantity: number
  discountPercent: number
  lineValue: number
}

interface LineUpdatedPayload {
  lineId: string
  quantity: number
  discountPercent: number
  lineValue: number
}

interface QuoteCreatedPayload {
  customerId: string
}

function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === 'number' ? value : value.toNumber()
}

/**
 * Reconstructs quote lines from LineAdded + LineUpdated events in order.
 */
async function reconstructLinesFromEvents(events: Event[]): Promise<ReplayLineUsed[]> {
  const lineMap = new Map<string, ReplayLineUsed>()

  for (const event of events) {
    if (event.type === 'LineAdded') {
      const payload = event.payload as unknown as LineAddedPayload
      const product = await prisma.product.findUnique({
        where: { id: payload.productId },
        select: { category: true },
      })

      if (!product) {
        throw Object.assign(new Error(`Product ${payload.productId} not found for replay`), {
          statusCode: 400,
        })
      }

      lineMap.set(payload.lineId, {
        lineId: payload.lineId,
        productId: payload.productId,
        quantity: payload.quantity,
        discountPercent: payload.discountPercent,
        lineValue: payload.lineValue,
        category: product.category,
      })
    } else if (event.type === 'LineUpdated') {
      const payload = event.payload as unknown as LineUpdatedPayload
      const existing = lineMap.get(payload.lineId)
      if (existing) {
        existing.quantity = payload.quantity
        existing.discountPercent = payload.discountPercent
        existing.lineValue = payload.lineValue
      }
    }
  }

  return Array.from(lineMap.values())
}

async function reconstructLinesFromQuoteTable(quoteId: string): Promise<ReplayLineUsed[]> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: { include: { product: true } } },
  })
  if (!quote) return []

  return quote.lines.map((line) => ({
    lineId: line.id,
    productId: line.productId,
    quantity: line.quantity,
    discountPercent: line.discountPercent,
    lineValue: decimalToNumber(line.lineValue),
    category: line.product.category,
  }))
}

function mergeCeilings(
  realCeilings: { category: string; customerTier: string; ceilingPercent: number }[],
  hypotheticalCeilings: HypotheticalCeiling[] | undefined,
  customerTier: string,
) {
  const merged = realCeilings.map((c) => ({ ...c }))
  if (!hypotheticalCeilings?.length) return merged

  for (const override of hypotheticalCeilings) {
    if (override.customerTier !== customerTier) continue
    const index = merged.findIndex(
      (c) => c.category === override.category && c.customerTier === override.customerTier,
    )
    if (index >= 0) {
      merged[index] = { ...override }
    } else {
      merged.push({ ...override })
    }
  }

  return merged
}

export async function replayQuoteWhatIf(
  quoteId: string,
  hypotheticalCeilings?: HypotheticalCeiling[],
) {
  const events = await getEventsForAggregate(quoteId)
  let customerId: string
  let linesUsedInReplay: ReplayLineUsed[]
  let replaySource: 'events' | 'snapshot'

  if (events.length === 0) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { customer: { include: { tier: true } } },
    })
    if (!quote) {
      throw Object.assign(new Error('Quote not found'), { statusCode: 404 })
    }
    customerId = quote.customerId
    linesUsedInReplay = await reconstructLinesFromQuoteTable(quoteId)
    replaySource = 'snapshot'
  } else {
    const createdEvent = events.find((e) => e.type === 'QuoteCreated')
    if (!createdEvent) {
      throw Object.assign(new Error('QuoteCreated event missing from event log'), { statusCode: 400 })
    }

    customerId = (createdEvent.payload as unknown as QuoteCreatedPayload).customerId
    linesUsedInReplay = await reconstructLinesFromEvents(events)

    // Event log exists but no line events yet — use current lines (e.g. quote created, lines not added via API)
    if (linesUsedInReplay.length === 0) {
      linesUsedInReplay = await reconstructLinesFromQuoteTable(quoteId)
    }
    replaySource = 'events'
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { tier: true },
  })

  if (!customer) {
    throw Object.assign(new Error('Customer not found'), { statusCode: 404 })
  }

  const riskLines: RiskLineInput[] = linesUsedInReplay.map((line) => ({
    discountPercent: line.discountPercent,
    lineValue: line.lineValue,
    category: line.category,
  }))

  const { ceilings, tierDefaults } = await loadPolicyConfig()
  const customerTier = customer.tier.name

  const actualRiskScore = computeBlendedRisk(riskLines, customerTier, ceilings, tierDefaults)
  const mergedCeilings = mergeCeilings(ceilings, hypotheticalCeilings, customerTier)
  const hypotheticalRiskScore = computeBlendedRisk(
    riskLines,
    customerTier,
    mergedCeilings,
    tierDefaults,
  )

  const actualRouting = await resolveApprovalChain(actualRiskScore)
  const hypotheticalRouting = await resolveApprovalChain(hypotheticalRiskScore)

  const round = (n: number) => Math.round(n * 10000) / 10000

  return {
    actual: {
      riskScore: round(actualRiskScore),
      routing: actualRouting,
    },
    hypothetical: {
      riskScore: round(hypotheticalRiskScore),
      routing: hypotheticalRouting,
    },
    changed:
      round(actualRiskScore) !== round(hypotheticalRiskScore) ||
      actualRouting.join(',') !== hypotheticalRouting.join(','),
    linesUsedInReplay,
    replaySource,
  }
}
