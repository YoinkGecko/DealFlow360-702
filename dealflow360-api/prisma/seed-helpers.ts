import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { appendEvent } from '../src/core/event-store.js'
import { applyApprovalRouting } from '../src/modules/policy/approval-routing.js'
import { computeQuoteBlendedRisk } from '../src/modules/policy/policy.service.js'
import { routeForRiskScore } from '../src/modules/policy/approval-routing.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export async function computeAndPersistQuoteRisk(
  prisma: PrismaClient,
  quoteId: string,
  customerTierName: string,
) {
  const lines = await prisma.quoteLine.findMany({
    where: { quoteId },
    include: { product: true },
  })
  const riskLines = lines.map((l) => ({
    discountPercent: l.discountPercent,
    lineValue: Number(l.lineValue),
    category: l.product.category,
  }))
  const blendedRiskScore = await computeQuoteBlendedRisk(riskLines, customerTierName)
  await prisma.quote.update({
    where: { id: quoteId },
    data: { blendedRiskScore },
  })
  return blendedRiskScore
}

/** Insert decided Approval rows + events for quotes that completed the approval chain. */
export async function seedDecidedApprovals(
  quoteId: string,
  blendedRiskScore: number,
  baseDate: Date,
  users: { managerId: string; financeId: string },
) {
  const approvers = await routeForRiskScore(blendedRiskScore)
  if (approvers.length === 0) return

  const roleToUserId: Record<string, string> = {
    MANAGER: users.managerId,
    FINANCE: users.financeId,
  }

  for (let i = 0; i < approvers.length; i++) {
    const role = approvers[i]!
    const decidedAt = new Date(baseDate.getTime() + (i + 1) * MS_PER_DAY * 0.5)
    const reason = `Approved — blended risk ${(blendedRiskScore * 100).toFixed(1)}% within ${role} threshold`

    const approval = await prisma.approval.create({
      data: {
        quoteId,
        approverRole: role,
        decision: 'APPROVED',
        reason,
        approverUserId: roleToUserId[role] ?? null,
        decidedAt,
        sortOrder: i,
      },
    })

    await appendEvent({
      aggregateId: quoteId,
      aggregateType: 'Quote',
      type: 'ApprovalDecided',
      payload: {
        approvalId: approval.id,
        decision: 'APPROVED',
        reason,
        approverRole: role,
      },
      actorUserId: roleToUserId[role] ?? null,
    })
  }
}

export async function seedPendingApprovalsForQuote(
  quoteId: string,
  blendedRiskScore: number,
  repUserId: string,
) {
  await applyApprovalRouting(quoteId, blendedRiskScore, repUserId, {
    approvalEventType: 'ApprovalRequested',
  })
}

export async function seedPortalSession(
  prisma: PrismaClient,
  data: {
    customerId: string
    quoteId: string
    token: string
    expiresAt: Date
  },
) {
  return prisma.portalSession.create({
    data: {
      id: randomUUID(),
      customerId: data.customerId,
      quoteId: data.quoteId,
      token: data.token,
      expiresAt: data.expiresAt,
      usedAt: null,
    },
  })
}
