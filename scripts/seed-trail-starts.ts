/**
 * One-time: seed one trail point per team from current lastLat/lastLng.
 * Run: npx tsx scripts/seed-trail-starts.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { lastLat: { not: null }, lastLng: { not: null } },
    select: { id: true, lastLat: true, lastLng: true },
  });

  for (const t of teams) {
    const existing = await prisma.teamLocationPoint.count({ where: { teamId: t.id } });
    if (existing > 0) continue;
    await prisma.teamLocationPoint.create({
      data: {
        teamId: t.id,
        lat: t.lastLat!,
        lng: t.lastLng!,
      },
    });
    console.log("Seeded trail start for team", t.id);
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
