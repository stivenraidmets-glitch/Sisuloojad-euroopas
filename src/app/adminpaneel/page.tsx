import { prisma } from "@/lib/db";
import { ensureDefaultTeams } from "@/lib/default-teams";
import type { Prisma } from "@prisma/client";
import {
  AdminClient,
  ChatControls,
  TeamDistanceControls,
  CountryUnlockControls,
  TeamLocationMapWithControls,
  PenaltyActions,
  EventTimerControls,
} from "./AdminClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type PenaltyWithRelations = Prisma.PenaltyGetPayload<{
  include: { penaltyOption: true; team: true };
}>;
type PurchaseWithRelations = Prisma.PurchaseGetPayload<{
  include: { penaltyOption: true; team: true };
}>;

type CountryUnlockWithTeam = Awaited<ReturnType<typeof prisma.countryUnlock.findMany>>[number] & {
  team: { id: number; name: string; color: string };
};

export default async function AdminPage() {
  let results: PromiseSettledResult<unknown>[];
  try {
    await ensureDefaultTeams();
    results = await Promise.allSettled([
    prisma.team.findMany({ orderBy: { id: "asc" } }),
    prisma.penalty.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { penaltyOption: true, team: true },
    }),
    prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { penaltyOption: true, team: true },
    }),
    prisma.raceStatus.findUnique({ where: { id: "default" } }),
    prisma.wheelConfig.findUnique({ where: { id: "default" } }),
    prisma.vote.groupBy({ by: ["teamId"], _count: true }),
    prisma.countryUnlock.findMany({
      orderBy: { unlockedAt: "asc" },
      include: { team: { select: { id: true, name: true, color: true } } },
    }),
  ]);
  } catch (e) {
    console.error("Admin page load error:", e);
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
        <h1 className="text-xl font-semibold">Admin panel – load error</h1>
        <p className="max-w-md text-center text-muted-foreground">
          Could not load data (database or server). Check Vercel env: DATABASE_URL, then redeploy and try again.
        </p>
        <a href="/adminpaneel" className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">
          Try again
        </a>
      </div>
    );
  }

  const teams = (results[0].status === "fulfilled" ? results[0].value : []) as Awaited<ReturnType<typeof prisma.team.findMany>>;
  const penalties = (results[1].status === "fulfilled" ? results[1].value : []) as PenaltyWithRelations[];
  const purchases = (results[2].status === "fulfilled" ? results[2].value : []) as PurchaseWithRelations[];
  const raceStatus = (results[3].status === "fulfilled" ? results[3].value : null) as {
    status?: string;
    eventStartedAt?: Date | null;
  } | null;
  const wheelConfig = (results[4].status === "fulfilled" ? results[4].value : null) as { outcomesJson?: string } | null;
  const voteCounts = (results[5].status === "fulfilled" ? results[5].value : []) as { teamId: number; _count: number }[];
  const countryUnlocks = (results[6].status === "fulfilled" ? results[6].value : []) as CountryUnlockWithTeam[];

  const failedCount = results.filter((r) => r.status === "rejected").length;
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error("Admin query failed:", i, r.reason);
  });

  return (
    <div className="container space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Halduspaneel</h1>
      {failedCount > 0 && (
        <div className="rounded border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Mõned andmed ei laadinud ({failedCount} päringut ebaõnnestus). Proovi uuesti või kontrolli andmebaasi.
        </div>
      )}

      <AdminClient
        initialRaceStatus={raceStatus?.status ?? "pre-race"}
        initialWheelConfig={wheelConfig?.outcomesJson ?? "[]"}
        initialUnlocks={countryUnlocks.map((u) => ({ ...u, unlockedAt: u.unlockedAt.toISOString() }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Sündmuse taimer</CardTitle>
          <CardDescription>Näitab, kui kaua võistlus on kestnud. Lähtesta, et alustada loendust uuesti.</CardDescription>
        </CardHeader>
        <CardContent>
          <EventTimerControls initialStartedAt={raceStatus?.eventStartedAt?.toISOString() ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vestlus (chat)</CardTitle>
          <CardDescription>Tühjenda vestlus</CardDescription>
        </CardHeader>
        <CardContent>
          <ChatControls />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meeskonna läbitud distants (km)</CardTitle>
          <CardDescription>Lähtesta või sea käsitsi väärtus</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamDistanceControls teams={teams} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riigid (esimesena jõudnud meeskond)</CardTitle>
          <CardDescription>Lisa riik meeskonnale või eemalda. Kaart uuendub kohe.</CardDescription>
        </CardHeader>
        <CardContent>
          <CountryUnlockControls initialUnlocks={countryUnlocks.map((u) => ({ ...u, unlockedAt: u.unlockedAt.toISOString() }))} teams={teams} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meeskonnad</CardTitle>
          <CardDescription>Lohista meeskondi minikaardil, sea asukoht või kasuta viimast otseülekande asukohta. Hääled all.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TeamLocationMapWithControls teams={teams} />
          <div className="flex flex-wrap gap-4 border-t pt-4">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="font-medium">{t.name}</span>
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-sm text-muted-foreground">
                  Hääli: {voteCounts.find((v) => v.teamId === t.id)?._count ?? 0}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Karistused</CardTitle>
          <CardDescription>Märgi ACTIVE / COMPLETED</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {penalties.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <span>
                  {p.penaltyOption.title} → {p.team.name} ({p.status})
                </span>
                <PenaltyActions penaltyId={p.id} status={p.status} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Viimased ostud</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {purchases.map((p) => (
              <li key={p.id}>
                {p.penaltyOption?.title} — {p.status} — €{(p.amountCents / 100).toFixed(2)} —{" "}
                {p.createdAt.toISOString()}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
