import { prisma } from '../../db/client.js'
import { paginateParams, paginatedResult } from '../../core/pagination.js'

export async function listCustomers(filters: { page?: number; limit?: number; search?: string } = {}) {
  const { skip, take, page, limit } = paginateParams(filters.page, filters.limit)
  const where = filters.search
    ? {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { email: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { tier: true },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.customer.count({ where }),
  ])
  return paginatedResult(items, total, page, limit)
}

export async function createCustomer(data: {
  name: string
  email: string
  customerTierId: string
}) {
  const tier = await prisma.customerTier.findUnique({
    where: { id: data.customerTierId },
  })
  if (!tier) {
    throw Object.assign(new Error('Customer tier not found'), { statusCode: 404 })
  }

  return prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      customerTierId: data.customerTierId,
    },
    include: { tier: true },
  })
}
