import { prisma } from "@/lib/db";

const DEFAULT_TEAMS = [
  { id: 1, name: "Kozip", color: "#3B82F6", imageUrl: "/team1.png" },
  { id: 2, name: "Stiven ja Sidni", color: "#EF4444", imageUrl: "/team2.png" },
  { id: 3, name: "Gepu ja Kris", color: "#22C55E", imageUrl: null },
] as const;

export async function ensureDefaultTeams() {
  await Promise.all(
    DEFAULT_TEAMS.map((team) =>
      prisma.team.upsert({
        where: { id: team.id },
        update: {
          name: team.name,
          color: team.color,
          imageUrl: team.imageUrl,
        },
        create: {
          id: team.id,
          name: team.name,
          color: team.color,
          imageUrl: team.imageUrl,
        },
      })
    )
  );
}
