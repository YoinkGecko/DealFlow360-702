import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding DealFlow360 database...')

  await prisma.approval.deleteMany()
  await prisma.quoteLine.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.event.deleteMany()
  await prisma.priceListEntry.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.categoryDiscountCeiling.deleteMany()
  await prisma.approvalChainRule.deleteMany()
  await prisma.customerTier.deleteMany()
  await prisma.user.deleteMany()

  const bronze = await prisma.customerTier.create({
    data: { name: 'Bronze', defaultDiscountCeiling: 5 },
  })

  const gold = await prisma.customerTier.create({
    data: { name: 'Gold', defaultDiscountCeiling: 15 },
  })

  await prisma.categoryDiscountCeiling.createMany({
    data: [
      { category: 'Hardware', customerTier: 'Gold', ceilingPercent: 15 },
      { category: 'Service', customerTier: 'Gold', ceilingPercent: 10 },
      { category: 'Hardware', customerTier: 'Bronze', ceilingPercent: 5 },
    ],
  })

  await prisma.approvalChainRule.createMany({
    data: [
      {
        minRiskScore: 0,
        maxRiskScore: 0.5,
        requiredApprovers: ['MANAGER'],
      },
      {
        minRiskScore: 0.5,
        maxRiskScore: 999999,
        requiredApprovers: ['MANAGER', 'FINANCE'],
      },
    ],
  })

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Laptop Pro 14',
        category: 'Hardware',
        unitPrice: 98000,
        description: 'Enterprise laptop',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Docking Station',
        category: 'Hardware',
        unitPrice: 14500,
        description: 'USB-C dock',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Onsite Setup Service',
        category: 'Service',
        unitPrice: 45000,
        description: 'Implementation and setup',
      },
    }),
    prisma.product.create({
      data: {
        name: 'CRM Platform Enterprise',
        category: 'Service',
        unitPrice: 480000,
        description: 'Annual software license',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Extended Warranty',
        category: 'Hardware',
        unitPrice: 18000,
        description: '2-year hardware warranty',
      },
    }),
  ])

  for (const product of products) {
    await prisma.priceListEntry.createMany({
      data: [
        { productId: product.id, customerTier: 'Gold', price: Number(product.unitPrice), currency: 'INR' },
        {
          productId: product.id,
          customerTier: 'Bronze',
          price: Number(product.unitPrice) * 1.05,
          currency: 'INR',
        },
      ],
    })
  }

  const passwordHash = await bcrypt.hash('password123', 12)

  const rep = await prisma.user.create({
    data: {
      email: 'rep@dealflow360.test',
      passwordHash,
      name: 'Alex Rao',
      role: UserRole.REP,
    },
  })

  const manager = await prisma.user.create({
    data: {
      email: 'manager@dealflow360.test',
      passwordHash,
      name: 'Sarah Kapoor',
      role: UserRole.MANAGER,
    },
  })

  const finance = await prisma.user.create({
    data: {
      email: 'finance@dealflow360.test',
      passwordHash,
      name: 'Raj Iyer',
      role: UserRole.FINANCE,
    },
  })

  await prisma.user.create({
    data: {
      email: 'admin@dealflow360.test',
      passwordHash,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  })

  const acme = await prisma.customer.create({
    data: {
      name: 'Acme Corporation',
      tierId: gold.id,
    },
  })

  console.log('\n✅ Seed complete!\n')
  console.log('Test users (password: password123):')
  console.log(`  REP:     ${rep.email}`)
  console.log(`  MANAGER: ${manager.email}`)
  console.log(`  FINANCE: ${finance.email}`)
  console.log(`\nSample Gold customer ID: ${acme.id}`)
  console.log(`Sample Hardware product ID: ${products[0].id}`)
  console.log(`Sample Service product ID: ${products[2].id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
