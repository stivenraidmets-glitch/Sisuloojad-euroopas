import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.team.upsert({
    where: { id: 1 },
    update: { name: "Kozip", color: "#3B82F6" },
    create: { id: 1, name: "Kozip", color: "#3B82F6" },
  });
  await prisma.team.upsert({
    where: { id: 2 },
    update: { name: "Stiven ja Sidni", color: "#EF4444" },
    create: { id: 2, name: "Stiven ja Sidni", color: "#EF4444" },
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
  await prisma.penaltyOption.upsert({
    where: { id: "detour" },
    update: {
      title: "Ringtee ülesanne",
      description: "Meeskond peab täitma ringtee ülesande",
    },
    create: {
      id: "detour",
      teamSpecific: true,
      title: "Ringtee ülesanne",
      description: "Meeskond peab täitma ringtee ülesande",
      durationMinutes: null,
      priceCents: 799,
      type: "DETOUR",
    },
  });

  await prisma.raceStatus.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", status: "pre-race" },
  });

  const defaultWheelOutcomes = JSON.stringify([
    { type: "CREDITS", value: 10, probability: 40 },
    { type: "CREDITS", value: 25, probability: 20 },
    { type: "FREE_PENALTY", value: 0, probability: 10 },
    { type: "NOTHING", value: 0, probability: 30 },
  ]);
  await prisma.wheelConfig.upsert({
    where: { id: "default" },
    update: { outcomesJson: defaultWheelOutcomes },
    create: { id: "default", outcomesJson: defaultWheelOutcomes },
  });

  console.log("Seed completed: teams, penalty options, race status, wheel config.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
