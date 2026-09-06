import { prisma } from '../../db/client.js'

export async function listCustomers() {
  return prisma.customer.findMany({
    include: { tier: true },
    orderBy: { name: 'asc' },
  })
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
