import { PrismaClient } from '@prisma/client'
import { recomputeCoOccurrenceFromHistory } from '../src/modules/recs/recs.service.js'

const prisma = new PrismaClient()

async function main() {
  console.log('Recomputing ProductCoOccurrence + ProductPurchaseCount from CONFIRMED quotes...')
  const stats = await recomputeCoOccurrenceFromHistory()
  console.log('Done:', stats)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
