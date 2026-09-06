import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { recomputeCoOccurrenceFromHistory } from '../src/modules/recs/recs.service.js'
import { backfillAllConfirmedQuoteTransitions } from './seed-stage-transitions-helper.js'

const prisma = new PrismaClient()

const MS_PER_DAY = 24 * 60 * 60 * 1000

async function main() {
  console.log('Seeding DealFlow360 database...')
  // Stage transition backfill simulates historical dwell data (no real usage yet).
  // Re-run backfill alone: npm run seed:stage-transitions

  await prisma.quoteStageTransition.deleteMany()
  await prisma.changeRequest.deleteMany()
  await prisma.portalSession.deleteMany()
  await prisma.allocation.deleteMany()
  await prisma.backorder.deleteMany()
  await prisma.stockLevel.deleteMany()
  await prisma.ledgerLine.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.subscriptionPlan.deleteMany()
  await prisma.productCoOccurrence.deleteMany()
  await prisma.productPurchaseCount.deleteMany()
  await prisma.warehouse.deleteMany()
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

  const silver = await prisma.customerTier.create({
    data: { name: 'Silver', defaultDiscountCeiling: 10 },
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
        name: 'Laptop Bag',
        category: 'Hardware',
        unitPrice: 3500,
        description: 'Professional carry bag',
        isPromoted: true,
        promotionTag: 'BUNDLE_ATTACH',
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

  const [laptop, laptopBag, dock, setup, crm, warranty] = products

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

  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: { name: 'Mumbai Central', shippingCostPerUnit: 50 },
    }),
    prisma.warehouse.create({
      data: { name: 'Delhi NCR', shippingCostPerUnit: 70 },
    }),
    prisma.warehouse.create({
      data: { name: 'Bangalore South', shippingCostPerUnit: 90 },
    }),
  ])

  const [mumbai, delhi, bangalore] = warehouses

  // Split laptop stock across two warehouses for allocator testing
  await prisma.stockLevel.createMany({
    data: [
      { warehouseId: mumbai.id, productId: laptop.id, quantityAvailable: 8 },
      { warehouseId: delhi.id, productId: laptop.id, quantityAvailable: 12 },
      { warehouseId: bangalore.id, productId: laptop.id, quantityAvailable: 5 },
      { warehouseId: mumbai.id, productId: laptopBag.id, quantityAvailable: 40 },
      { warehouseId: delhi.id, productId: laptopBag.id, quantityAvailable: 25 },
      { warehouseId: mumbai.id, productId: dock.id, quantityAvailable: 15 },
      { warehouseId: delhi.id, productId: dock.id, quantityAvailable: 10 },
      { warehouseId: bangalore.id, productId: warranty.id, quantityAvailable: 20 },
      { warehouseId: mumbai.id, productId: setup.id, quantityAvailable: 999 },
      { warehouseId: delhi.id, productId: crm.id, quantityAvailable: 999 },
    ],
  })

  const supportPlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Support Plan',
      billingCycleDays: 30,
      pricePerUnit: 3000,
    },
  })

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
      email: 'procurement@acmecorp.test',
      customerTierId: gold.id,
    },
  })

  const beta = await prisma.customer.create({
    data: {
      name: 'Beta Industries',
      email: 'buying@betaindustries.test',
      customerTierId: silver.id,
    },
  })

  const nova = await prisma.customer.create({
    data: {
      name: 'Nova Retail',
      email: 'orders@novaretail.test',
      customerTierId: gold.id,
    },
  })

  const lineValue = (unitPrice: number, qty: number, discount = 0) =>
    unitPrice * qty * (1 - discount / 100)

  type LineSpec = { productId: string; quantity: number; discount?: number }

  const repDiscounts = [5, 6, 7, 8, 5, 6, 7, 8, 6, 5, 7, 6, 8, 5, 7, 6, 8, 5]

  const historicalOrders: LineSpec[][] = [
    [{ productId: laptop.id, quantity: 2 }, { productId: laptopBag.id, quantity: 2 }],
    [{ productId: laptop.id, quantity: 1 }, { productId: laptopBag.id, quantity: 1 }],
    [{ productId: laptop.id, quantity: 3 }, { productId: laptopBag.id, quantity: 3 }],
    [{ productId: laptop.id, quantity: 1 }, { productId: laptopBag.id, quantity: 1 }, { productId: dock.id, quantity: 1 }],
    [{ productId: laptop.id, quantity: 2 }, { productId: laptopBag.id, quantity: 2 }],
    [{ productId: laptop.id, quantity: 1 }, { productId: laptopBag.id, quantity: 1 }],
    [{ productId: laptop.id, quantity: 1 }, { productId: warranty.id, quantity: 1 }],
    [{ productId: laptop.id, quantity: 2 }, { productId: laptopBag.id, quantity: 2 }],
    [{ productId: laptop.id, quantity: 1 }, { productId: laptopBag.id, quantity: 1 }],
    [{ productId: laptop.id, quantity: 1 }],
    [{ productId: dock.id, quantity: 2 }],
    [{ productId: crm.id, quantity: 1 }],
    [{ productId: setup.id, quantity: 1 }],
    [{ productId: warranty.id, quantity: 3 }],
    [{ productId: laptopBag.id, quantity: 5 }],
    [{ productId: laptop.id, quantity: 1 }, { productId: laptopBag.id, quantity: 1 }, { productId: warranty.id, quantity: 1 }],
    [{ productId: dock.id, quantity: 1 }, { productId: setup.id, quantity: 1 }],
    [{ productId: crm.id, quantity: 1 }, { productId: setup.id, quantity: 1 }],
  ]

  let orderIndex = 0
  for (const lines of historicalOrders) {
    const createdAt = new Date(Date.now() - (30 - orderIndex) * MS_PER_DAY)
    const quote = await prisma.quote.create({
      data: {
        customerId: acme.id,
        repUserId: rep.id,
        status: 'CONFIRMED',
        blendedRiskScore: 0,
        createdAt,
      },
    })

    let lineIdx = 0
    for (const line of lines) {
      const product = products.find((p) => p.id === line.productId)!
      const unitPrice = Number(product.unitPrice)
      const discount =
        line.discount ?? repDiscounts[(orderIndex + lineIdx) % repDiscounts.length]
      await prisma.quoteLine.create({
        data: {
          quoteId: quote.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice,
          discountPercent: discount,
          lineValue: lineValue(unitPrice, line.quantity, discount),
        },
      })
      lineIdx++
    }
    orderIndex++
  }

  const stageCount = await backfillAllConfirmedQuoteTransitions(prisma)

  // Active DRAFT quote for anomaly demo — rep history is low (5-8%), one line at 25%
  const anomalyDemoQuote = await prisma.quote.create({
    data: {
      customerId: acme.id,
      repUserId: rep.id,
      status: 'DRAFT',
      blendedRiskScore: 0.35,
      createdAt: new Date(),
    },
  })

  await prisma.quoteLine.createMany({
    data: [
      {
        quoteId: anomalyDemoQuote.id,
        productId: laptop.id,
        quantity: 2,
        unitPrice: Number(laptop.unitPrice),
        discountPercent: 6,
        lineValue: lineValue(Number(laptop.unitPrice), 2, 6),
      },
      {
        quoteId: anomalyDemoQuote.id,
        productId: setup.id,
        quantity: 1,
        unitPrice: Number(setup.unitPrice),
        discountPercent: 25,
        lineValue: lineValue(Number(setup.unitPrice), 1, 25),
      },
    ],
  })

  await prisma.quoteStageTransition.create({
    data: {
      quoteId: anomalyDemoQuote.id,
      fromStatus: 'INITIAL',
      toStatus: 'DRAFT',
      transitionedAt: new Date(),
    },
  })

  // PENDING_APPROVAL quote sitting long enough to surface stall detection
  const stalledPendingQuote = await prisma.quote.create({
    data: {
      customerId: acme.id,
      repUserId: rep.id,
      status: 'PENDING_APPROVAL',
      blendedRiskScore: 0.42,
      createdAt: new Date(Date.now() - 12 * MS_PER_DAY),
    },
  })

  await prisma.quoteLine.create({
    data: {
      quoteId: stalledPendingQuote.id,
      productId: crm.id,
      quantity: 1,
      unitPrice: Number(crm.unitPrice),
      discountPercent: 7,
      lineValue: lineValue(Number(crm.unitPrice), 1, 7),
    },
  })

  const stalledEnteredPending = new Date(Date.now() - 10 * MS_PER_DAY)
  await prisma.quoteStageTransition.createMany({
    data: [
      {
        quoteId: stalledPendingQuote.id,
        fromStatus: 'INITIAL',
        toStatus: 'DRAFT',
        transitionedAt: new Date(Date.now() - 12 * MS_PER_DAY),
      },
      {
        quoteId: stalledPendingQuote.id,
        fromStatus: 'DRAFT',
        toStatus: 'PENDING_APPROVAL',
        transitionedAt: stalledEnteredPending,
      },
    ],
  })

  const recsStats = await recomputeCoOccurrenceFromHistory()

  console.log('\n✅ Seed complete!\n')
  console.log('Test users (password: password123):')
  console.log(`  REP:     ${rep.email}`)
  console.log(`  MANAGER: ${manager.email}`)
  console.log(`  FINANCE: ${finance.email}`)
  console.log(`\nSample Gold customer ID: ${acme.id}`)
  console.log(`Sample Silver customer ID: ${beta.id}`)
  console.log(`Additional customer: Nova Retail (${nova.id})`)
  console.log(`Customer portal email: ${acme.email}`)
  console.log(`Laptop product ID: ${laptop.id}`)
  console.log(`Laptop Bag product ID: ${laptopBag.id}`)
  console.log(`Support Plan ID: ${supportPlan.id}`)
  console.log(`Warehouses: ${warehouses.map((w) => w.name).join(', ')}`)
  console.log(
    `\nRecs bootstrap: ${recsStats.confirmedQuotesProcessed} confirmed quotes → ${recsStats.coOccurrencePairs} pairs, ${recsStats.productPurchaseCounts} product counts`,
  )
  console.log(`Stage transitions backfilled: ${stageCount} confirmed quotes`)
  console.log(`Anomaly demo DRAFT quote ID: ${anomalyDemoQuote.id}`)
  console.log(`Stalled PENDING_APPROVAL quote ID: ${stalledPendingQuote.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
