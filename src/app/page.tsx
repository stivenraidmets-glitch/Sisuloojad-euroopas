import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { RaceMap } from "@/components/map/RaceMap";
import { VoteModule } from "@/components/vote/VoteModule";
import { PenaltyShop } from "@/components/shop/PenaltyShop";
import { HomeClient } from "./HomeClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getTeams() {
  return prisma.team.findMany({
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
}

async function getRecentPenalties() {
  return prisma.penalty.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      penaltyOption: { select: { title: true } },
      team: { select: { name: true } },
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
        <h1 className="text-2xl font-bold">Paris → Tallinn võistlus</h1>
        <p className="text-muted-foreground">
          Andmebaas pole hetkel saadaval. Kontrolli Vercel-is, et DATABASE_URL on õige ja andmebaas on üleval.
        </p>
      </div>
    );
  }

  const team1 = teams[0];
  const team2 = teams[1];
  const team1Name = team1?.name ?? "Meeskond 1";
  const team2Name = team2?.name ?? "Meeskond 2";

  return (
    <div className="container space-y-8 px-4 py-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold">Paris → Tallinn võistlus (rahata)</h1>
        <p className="mb-6 text-muted-foreground">
          Jälgi meeskondade ligikaudseid asukohti kaardil. Hääleta, osta sekkumisi ja keeruta ratast.
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

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Viimased karistused</CardTitle>
            <CardDescription>Hiljuti ostetud sekkumised</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentPenalties.length === 0 ? (
                <li className="text-muted-foreground">Karistusi veel pole.</li>
              ) : (
                recentPenalties.map((p) => (
                  <li key={p.id} className="flex justify-between text-sm">
                    <span>
                      <strong>{p.penaltyOption?.title ?? "—"}</strong> → {p.team?.name ?? "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {p.status} · {p.createdAt.toLocaleString()}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
