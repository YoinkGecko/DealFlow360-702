import { prisma } from '../../db/client.js'

export async function listProducts() {
  return prisma.product.findMany({ orderBy: { name: 'asc' } })
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
