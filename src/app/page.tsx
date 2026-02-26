import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getTeamPenaltyQueue } from "@/lib/penalty-queue";
import { RaceMap } from "@/components/map/RaceMap";
import { VoteModule } from "@/components/vote/VoteModule";
import { PenaltyShop } from "@/components/shop/PenaltyShop";
import { HomeClient } from "./HomeClient";
import { RecentPenaltiesCard } from "@/components/home/RecentPenaltiesCard";

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
      return {
        ...t,
        activePenalty: current,
        queuedPenalties: queued,
      };
    })
  );
  return withPenalties;
}

async function getRecentPenalties() {
  return prisma.penalty.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
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

  return (
    <div className="container space-y-8 px-4 py-8">
      <section>
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Alustame Nullist <span className="text-primary">·</span> Pariis – Tallinn
        </h1>
        <p className="mb-6 text-muted-foreground leading-relaxed">
          4 sisuloojat alustavad võistlusega Pariisist. Mõlemal tiimil on alguses 0€ ja nende eesmärk on jõuda esimesena tagasi Eestisse. Sina kui vaataja saad siin kodulehel elada enda tiimile reaalajas kaasa või hoopis aeglustada teist tiimi ostes erinevaid karistusi. Ära unusta ka keerutada loosratast, kus sul on võimalik võita üks tasuta karistus. Tervest sellest seiklusest tuleb eraldi YouTube seeria, mida näed juba varsti!
        </p>
        <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-muted" />}>
          <RaceMap
            teams={teams}
            accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
          />
        </Suspense>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <VoteModule team1Name={team1Name} team2Name={team2Name} />
        <PenaltyShop team1Name={team1Name} team2Name={team2Name} />
      </div>

      <HomeClient
        team1Name={team1Name}
        team2Name={team2Name}
        recentPenalties={recentPenalties.map((p) => ({
          id: p.id,
          teamName: p.team?.name ?? "—",
          title: p.penaltyOption?.title ?? "—",
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        }))}
      />

      <RecentPenaltiesCard
        penalties={recentPenalties.map((p) => ({
          id: p.id,
          title: p.penaltyOption?.title ?? "—",
          teamName: p.team?.name ?? "—",
          buyerName: p.purchasedBy?.name?.trim() || p.purchasedBy?.email || "—",
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
