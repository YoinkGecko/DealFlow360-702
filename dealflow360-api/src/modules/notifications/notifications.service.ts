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

export async function listNotificationsForUser(userId: string, limit = 20) {
  const items = await prisma.notification.findMany({
    where: { userId },
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
