/**
 * One-time script: complete all active penalties, remove non-TIMEOUT penalties,
 * and delete non-TIMEOUT options from the shop.
 * Run: npx tsx scripts/complete-and-clean-penalties.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Complete all active penalties
  const completed = await prisma.penalty.updateMany({
    where: { status: "ACTIVE" },
    data: { status: "COMPLETED" },
  });
  console.log("Completed", completed.count, "active penalty/penalties.");

  // 2. Get non-TIMEOUT penalty option IDs
  const nonTimeoutOptions = await prisma.penaltyOption.findMany({
    where: { type: { not: "TIMEOUT" } },
    select: { id: true, title: true, type: true },
  });
  const nonTimeoutIds = nonTimeoutOptions.map((o) => o.id);

  if (nonTimeoutIds.length === 0) {
    console.log("No non-TIMEOUT penalty options found. Shop already has only time pauses.");
    return;
  }

  // 3. Delete penalties that reference non-TIMEOUT options
  const deletedPenalties = await prisma.penalty.deleteMany({
    where: { penaltyOptionId: { in: nonTimeoutIds } },
  });
  console.log("Deleted", deletedPenalties.count, "non-TIMEOUT penalty/penalties.");

  // 4. Null out penaltyOptionId on purchases that reference non-TIMEOUT options
  const updatedPurchases = await prisma.purchase.updateMany({
    where: { penaltyOptionId: { in: nonTimeoutIds } },
    data: { penaltyOptionId: null },
  });
  if (updatedPurchases.count > 0) {
    console.log("Cleared penalty option reference on", updatedPurchases.count, "purchase(s).");
  }

  // 5. Delete non-TIMEOUT penalty options from shop
  const deletedOptions = await prisma.penaltyOption.deleteMany({
    where: { id: { in: nonTimeoutIds } },
  });
  console.log(
    "Removed",
    deletedOptions.count,
    "non-TIMEOUT option(s) from shop:",
    nonTimeoutOptions.map((o) => `${o.title} (${o.type})`).join(", ")
  );

  console.log("Done. Shop now has only time pause options.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
