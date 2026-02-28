import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getTeamPenaltyQueue } from "@/lib/penalty-queue";
import { RaceMap } from "@/components/map/RaceMap";
import { RightPanel } from "@/components/layout/RightPanel";

export const dynamic = "force-dynamic";

async function getTeams() {
  const teams = await prisma.team.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      lastLat: true,
      lastLng: true,
      lastUpdatedAt: true,
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

  const team1 = teams[0];
  const team2 = teams[1];
  const team1Name = team1?.name ?? "Kozip";
  const team2Name = team2?.name ?? "Stiven ja Sidni";

  const recentPenaltiesForPanel = recentPenalties.map((p) => ({
    id: p.id,
    title: p.penaltyOption?.title ?? "—",
    teamName: p.team?.name ?? "—",
    buyerName: p.purchasedBy?.name?.trim() || p.purchasedBy?.email || "—",
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <>
      <main className="min-h-[calc(100vh-3.5rem)] min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6">
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Alustame Nullist <span className="text-primary">·</span> Pariis – Tallinn
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              4 sisuloojat Pariisist. Jälgi kaardil, hääleta, osta karistusi, keeruta ratast.
            </p>
          </div>
          <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-muted" />}>
            <RaceMap
              teams={teams}
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
            />
          </Suspense>
        </section>
      </main>
      <RightPanel
        team1Name={team1Name}
        team2Name={team2Name}
        recentPenalties={recentPenaltiesForPanel}
      />
    </>
  );
}
