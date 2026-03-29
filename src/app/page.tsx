import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { prisma } from "@/lib/db";
import { getTeamPenaltyQueue } from "@/lib/penalty-queue";
import { ensureDefaultTeams } from "@/lib/default-teams";
import { RightPanel } from "@/components/layout/RightPanel";

const RaceMap = nextDynamic(() => import("@/components/map/RaceMap").then((m) => ({ default: m.RaceMap })), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] flex-1 rounded-lg bg-muted/20" aria-hidden />
  ),
});

export const dynamic = "force-dynamic";

async function getTeams() {
  await ensureDefaultTeams();
  const teams = await prisma.team.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      imageUrl: true,
      lastLat: true,
      lastLng: true,
      lastUpdatedAt: true,
      totalDistanceKm: true,
    },
  });
  const withPenalties = await Promise.all(
    teams.map(async (t) => {
      const { current, queued } = await getTeamPenaltyQueue(t.id);
      // Map only shows pause/TIMEOUT penalties, not Ringtee ülesanne (DETOUR) etc.
      const pauseOnly = (p: { type: string } | null) => p?.type === "TIMEOUT";
      return {
        ...t,
        activePenalty: pauseOnly(current) ? current : null,
        queuedPenalties: queued.filter((q) => q.type === "TIMEOUT"),
      };
    })
  );
  return withPenalties;
}

async function getRecentPenalties() {
  return prisma.penalty.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      penaltyOption: { select: { title: true } },
      team: { select: { name: true } },
      purchasedBy: { select: { name: true, email: true } },
    },
  });
}

export default async function HomePage() {
  let teams: Awaited<ReturnType<typeof getTeams>>;
  let recentPenalties: Awaited<ReturnType<typeof getRecentPenalties>>;
  try {
    [teams, recentPenalties] = await Promise.all([
      getTeams(),
      getRecentPenalties(),
    ]);
  } catch (e) {
    console.error("Home page data error:", e);
    return (
      <div className="container space-y-6 px-4 py-12">
        <h1 className="text-2xl font-bold">Alustame Nullist · Pariis – Tallinn</h1>
        <p className="text-muted-foreground">
          Andmebaas pole hetkel saadaval. Kontrolli Vercel-is, et DATABASE_URL on õige ja andmebaas on üleval.
        </p>
      </div>
    );
  }

  const panelTeams = teams.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
  }));

  const recentPenaltiesForPanel = recentPenalties.map((p) => ({
    id: p.id,
    title: p.penaltyOption?.title ?? "—",
    teamName: p.team?.name ?? "—",
    buyerName: p.purchasedBy?.name?.trim() || p.purchasedBy?.email || "—",
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col px-2 py-2 md:px-4 md:py-4">
        <section className="flex min-h-0 flex-1 flex-col">
          <RaceMap
              teams={teams}
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
              fullHeight
            />
        </section>
      </main>
      <RightPanel
        teams={panelTeams}
        recentPenalties={recentPenaltiesForPanel}
      />
    </>
  );
}
