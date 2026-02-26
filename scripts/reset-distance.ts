/**
 * One-time script: set both teams' totalDistanceKm to 0.
 * Run: npx tsx scripts/reset-distance.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.team.updateMany({
    data: { totalDistanceKm: 0 },
  });
  console.log("Reset traveled distance for", result.count, "teams.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
