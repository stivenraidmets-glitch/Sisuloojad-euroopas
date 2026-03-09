import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.team.upsert({
    where: { id: 1 },
    update: { name: "Kozip", color: "#3B82F6", imageUrl: "/team1.png" },
    create: { id: 1, name: "Kozip", color: "#3B82F6", imageUrl: "/team1.png" },
  });
  await prisma.team.upsert({
    where: { id: 2 },
    update: { name: "Stiven ja Sidni", color: "#EF4444", imageUrl: "/team2.png" },
    create: { id: 2, name: "Stiven ja Sidni", color: "#EF4444", imageUrl: "/team2.png" },
  });
  await prisma.team.upsert({
    where: { id: 3 },
    update: { name: "Team 3", color: "#22C55E" },
    create: { id: 3, name: "Team 3", color: "#22C55E" },
  });

  await prisma.penaltyOption.upsert({
    where: { id: "timeout-30sec" },
    update: {
      title: "30 sekundi külm",
      description: "Meeskond peab peatuma 30 sekundiks",
    },
    create: {
      id: "timeout-30sec",
      teamSpecific: true,
      title: "30 sekundi külm",
      description: "Meeskond peab peatuma 30 sekundiks",
      durationMinutes: 0.5,
      priceCents: 99,
      type: "TIMEOUT",
    },
  });
  await prisma.penaltyOption.upsert({
    where: { id: "timeout-15" },
    update: {
      title: "15 min paus",
      description: "Meeskond peab peatuma 15 minutiks",
    },
    create: {
      id: "timeout-15",
      teamSpecific: true,
      title: "15 min paus",
      description: "Meeskond peab peatuma 15 minutiks",
      durationMinutes: 15,
      priceCents: 499,
      type: "TIMEOUT",
    },
  });
  await prisma.penaltyOption.upsert({
    where: { id: "timeout-30" },
    update: {
      title: "30 min paus",
      description: "Meeskond peab peatuma 30 minutiks",
    },
    create: {
      id: "timeout-30",
      teamSpecific: true,
      title: "30 min paus",
      description: "Meeskond peab peatuma 30 minutiks",
      durationMinutes: 30,
      priceCents: 999,
      type: "TIMEOUT",
    },
  });
  await prisma.raceStatus.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", status: "pre-race" },
  });

  // Test: Estonia unlocked by Team 1 first (for map color demo)
  await prisma.countryUnlock.upsert({
    where: { countryCode: "EE" },
    create: { countryCode: "EE", teamId: 1 },
    update: { teamId: 1 },
  });

  const defaultWheelOutcomes = JSON.stringify([
    { type: "NOTHING", value: 0, probability: 50 },
    { type: "RESPIN", value: 0, probability: 25 },
    { type: "HALF_OFF_PENALTY", value: 50, probability: 15 },
    { type: "FREE_PENALTY", value: 0, probability: 10 },
  ]);
  await prisma.wheelConfig.upsert({
    where: { id: "default" },
    update: { outcomesJson: defaultWheelOutcomes },
    create: { id: "default", outcomesJson: defaultWheelOutcomes },
  });

  await prisma.user.upsert({
    where: { email: "system@voistlus.internal" },
    update: {},
    create: {
      email: "system@voistlus.internal",
      name: "Süsteem",
      creditsBalance: 0,
      hasSpunWheel: true,
    },
  });

  await prisma.user.updateMany({
    where: { name: "stivenraidmets" },
    data: { freePenaltyBalance: 50 },
  });

  console.log("Seed completed: 3 teams, penalty options, race status, wheel config, system user, Estonia (EE) = Team 1.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
