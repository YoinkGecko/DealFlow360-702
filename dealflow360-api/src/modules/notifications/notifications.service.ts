import type { UserRole } from '@prisma/client'
import { prisma } from '../../db/client.js'

export async function createNotification(params: {
  userId: string
  quoteId?: string
  message: string
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      quoteId: params.quoteId ?? null,
      message: params.message,
    },
  })
}

const APPROVER_ROLE_MAP: Record<string, UserRole[]> = {
  MANAGER: ['MANAGER', 'ADMIN'],
  FINANCE: ['FINANCE', 'ADMIN'],
}

/** Notify manager/finance (and admin) users that a quote needs their approval. */
export async function notifyApproversForQuote(
  quoteId: string,
  approverRoles: string[],
  context: 'submitted' | 'reentered' | 'next_in_chain',
) {
  if (approverRoles.length === 0) return

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { customer: true },
  })
  if (!quote) return

  const quoteRef = quote.id.slice(0, 8).toUpperCase()
  const roleLabels = approverRoles.join(' / ')

  const contextMessage =
    context === 'submitted'
      ? `New quote ${quoteRef} for ${quote.customer.name} requires ${roleLabels} approval`
      : context === 'reentered'
        ? `Quote ${quoteRef} for ${quote.customer.name} was re-submitted and requires ${roleLabels} approval`
        : `Quote ${quoteRef} for ${quote.customer.name} is ready for your ${roleLabels} approval`

  const rolesToNotify = new Set<UserRole>()
  for (const role of approverRoles) {
    for (const r of APPROVER_ROLE_MAP[role] ?? []) {
      rolesToNotify.add(r)
    }
  }

  const users = await prisma.user.findMany({
    where: { role: { in: [...rolesToNotify] } },
  })

  const uniqueUsers = [...new Map(users.map((u) => [u.id, u])).values()]

  await Promise.all(
    uniqueUsers.map((user) =>
      createNotification({
        userId: user.id,
        quoteId,
        message: contextMessage,
      }),
    ),
  )
}

export async function listNotificationsForUser(userId: string, limit = 20) {
  const items = await prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return items.map((n) => ({
    id: n.id,
    quoteId: n.quoteId,
    message: n.message,
    read: n.read,
    time: n.createdAt.toISOString(),
  }))
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!existing) {
    throw Object.assign(new Error('Notification not found'), { statusCode: 404 })
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}

export async function deleteNotification(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!existing) {
    throw Object.assign(new Error('Notification not found'), { statusCode: 404 })
  }

  await prisma.notification.delete({ where: { id: notificationId } })
}

export async function clearNotificationsForUser(userId: string) {
  await prisma.notification.deleteMany({ where: { userId } })
}
