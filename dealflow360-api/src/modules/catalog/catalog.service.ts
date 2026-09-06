import { prisma } from '../../db/client.js'
import { paginateParams, paginatedResult } from '../../core/pagination.js'

export async function listProducts(filters: { page?: number; limit?: number; search?: string } = {}) {
  const { skip, take, page, limit } = paginateParams(filters.page, filters.limit)
  const where = filters.search
    ? {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { category: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
    prisma.product.count({ where }),
  ])
  return paginatedResult(items, total, page, limit)
}

export async function createProduct(data: {
  name: string
  category: string
  unitPrice: number
  description?: string
}) {
  return prisma.product.create({
    data: {
      name: data.name,
      category: data.category,
      unitPrice: data.unitPrice,
      description: data.description,
    },
  })
}

export async function getPriceListForProduct(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) {
    throw Object.assign(new Error('Product not found'), { statusCode: 404 })
  }

  const entries = await prisma.priceListEntry.findMany({
    where: { productId },
    orderBy: { customerTier: 'asc' },
  })

  return { product, entries }
}

export async function getProductById(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) {
    throw Object.assign(new Error('Product not found'), { statusCode: 404 })
  }
  return product
}
