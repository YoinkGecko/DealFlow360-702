import type { Approval } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { appendEvent } from '../../core/event-store.js'
import { resolveApprovalChain } from './policy.service.js'

/**
 * Shared approval routing — used by quote submit (Phase 1) and portal counter-discount
 * re-entry (Phase 4). Returns the config-driven approver chain for a risk score.
 */
export async function routeForRiskScore(riskScore: number): Promise<string[]> {
  return resolveApprovalChain(riskScore)
}

export function approvalChainRank(chain: string[]): number {
  if (chain.includes('FINANCE')) return 2
  if (chain.includes('MANAGER')) return 1
  return 0
}

/** True when the new chain needs (re-)approval beyond what the previous chain required. */
export function requiresHigherApproval(previousChain: string[], newChain: string[]): boolean {
  if (newChain.length === 0) return false
  if (previousChain.length === 0) return true
  return approvalChainRank(newChain) > approvalChainRank(previousChain)
}

export async function applyApprovalRouting(
  quoteId: string,
  blendedRiskScore: number,
  actorUserId: string | null,
  options: {
    approvalEventType: 'ApprovalRequested' | 'QuoteReenteredApproval'
    autoApprove?: boolean
  },
) {
  const requiredApprovers = await routeForRiskScore(blendedRiskScore)

  if (requiredApprovers.length === 0) {
    if (options.autoApprove !== false) {
      const updated = await prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'APPROVED' },
      })

      await appendEvent({
        aggregateId: quoteId,
        aggregateType: 'Quote',
        type: 'QuoteAutoApproved',
        payload: { blendedRiskScore, reason: 'No approval rule matched' },
        actorUserId,
      })

      return { quote: updated, autoApproved: true, approvals: [] as Approval[] }
    }

    return {
      quote: await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } }),
      autoApproved: true,
      approvals: [] as Approval[],
    }
  }

  await appendEvent({
    aggregateId: quoteId,
    aggregateType: 'Quote',
    type: options.approvalEventType,
    payload: { blendedRiskScore, requiredApprovers },
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
