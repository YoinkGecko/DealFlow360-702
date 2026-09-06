import { PrismaClient } from '@prisma/client'
import { backfillAllConfirmedQuoteTransitions } from './seed-stage-transitions-helper.js'

const prisma = new PrismaClient()

/**
 * Re-backfill QuoteStageTransition from CONFIRMED quotes in the database.
 * Simulates historical stage dwell data when no real usage history exists yet.
 * Normal seed already runs this inline — use this command to refresh after manual DB edits.
 */
async function main() {
  const count = await backfillAllConfirmedQuoteTransitions(prisma)
  console.log(`Backfilled stage transitions for ${count} confirmed quotes`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
