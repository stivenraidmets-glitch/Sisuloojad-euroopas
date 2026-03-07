/**
 * One-off: set Estonia (EE) as unlocked by Team 1 for testing map colors.
 * Run: npx tsx scripts/seed-estonia-team1.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.countryUnlock.upsert({
    where: { countryCode: "EE" },
    create: { countryCode: "EE", teamId: 1 },
    update: { teamId: 1 },
  });
  console.log("Estonia (EE) set as unlocked by Team 1.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
