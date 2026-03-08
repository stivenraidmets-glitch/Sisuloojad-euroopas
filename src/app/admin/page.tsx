import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { AdminClient } from "./AdminClient";
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
  let teams: Awaited<ReturnType<typeof prisma.team.findMany>>;
  let penalties: PenaltyWithRelations[];
  let purchases: PurchaseWithRelations[];
  let raceStatus: { status: string } | null;
  let wheelConfig: { outcomesJson: string } | null;
  let voteCounts: { teamId: number; _count: number }[];
  let countryUnlocks: CountryUnlockWithTeam[];

  try {
    const [teamsResult, penaltiesResult, purchasesResult, raceStatusResult, wheelConfigResult, voteCountsResult, unlocksResult] =
      await Promise.all([
        prisma.team.findMany({ orderBy: { id: "asc" } }),
        prisma.penalty.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            penaltyOption: true,
            team: true,
          },
        }),
        prisma.purchase.findMany({
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { penaltyOption: true, team: true },
        }),
        prisma.raceStatus.findUnique({ where: { id: "default" } }),
        prisma.wheelConfig.findUnique({ where: { id: "default" } }),
        prisma.vote.groupBy({
          by: ["teamId"],
          _count: true,
        }),
        prisma.countryUnlock.findMany({
          orderBy: { unlockedAt: "asc" },
          include: { team: { select: { id: true, name: true, color: true } } },
        }),
      ]);
    teams = teamsResult;
    penalties = penaltiesResult;
    purchases = purchasesResult;
    raceStatus = raceStatusResult;
    wheelConfig = wheelConfigResult;
    voteCounts = voteCountsResult;
    countryUnlocks = unlocksResult as CountryUnlockWithTeam[];
  } catch (e) {
    console.error("Admin page data error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return (
      <div className="container max-w-md space-y-4 px-4 py-12">
        <h1 className="text-xl font-semibold">Halduspaneel – viga</h1>
        <p className="text-muted-foreground">
          Andmebaasiga ühendus ebaõnnestus. Kontrolli Vercelis:
        </p>
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          <li><strong>DATABASE_URL</strong> – õige Neon connection string</li>
          <li><strong>NEXTAUTH_SECRET</strong> – peab olema seatud</li>
          <li><strong>NEXTAUTH_URL</strong> – https://sisuloojad-euroopas.vercel.app (ilma lõpuslashita)</li>
          <li><strong>ADMIN_EMAILS</strong> – sinu e-mail (komadega eraldatud, kui mitu)</li>
        </ul>
        <p className="text-xs text-muted-foreground">Tehniline: {message}</p>
      </div>
    );
  }

  return (
    <div className="container space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Halduspaneel</h1>

      <AdminClient
        initialRaceStatus={raceStatus?.status ?? "pre-race"}
        initialWheelConfig={wheelConfig?.outcomesJson ?? "[]"}
        initialUnlocks={countryUnlocks.map((u) => ({ ...u, unlockedAt: u.unlockedAt.toISOString() }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Vestlus (chat)</CardTitle>
          <CardDescription>Tühjenda vestlus</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminClient.ChatControls />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meeskonna läbitud distants (km)</CardTitle>
          <CardDescription>Lähtesta või sea käsitsi väärtus</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminClient.TeamDistanceControls teams={teams} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riigid (esimesena jõudnud meeskond)</CardTitle>
          <CardDescription>Lisa riik meeskonnale või eemalda. Kaart uuendub kohe.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminClient.CountryUnlockControls initialUnlocks={countryUnlocks.map((u) => ({ ...u, unlockedAt: u.unlockedAt.toISOString() }))} teams={teams} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meeskonnad</CardTitle>
          <CardDescription>Asukoht ja häälete arv</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {teams.map((t) => (
            <div key={t.id} className="rounded border p-4">
              <div className="flex justify-between">
                <div>
                  <span className="font-medium">{t.name}</span>
                  <span
                    className="ml-2 inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t.lastLat != null && t.lastLng != null
                      ? `${t.lastLat.toFixed(4)}, ${t.lastLng.toFixed(4)}`
                      : "Asukoht puudub"}
                    {t.lastUpdatedAt && ` · ${t.lastUpdatedAt.toISOString()}`}
                  </p>
                </div>
                <p>Hääli: {voteCounts.find((v) => v.teamId === t.id)?._count ?? 0}</p>
              </div>
              <AdminClient.SetTeamLocation
                teamId={t.id}
                teamName={t.name}
                currentLat={t.lastLat}
                currentLng={t.lastLng}
              />
            </div>
          ))}
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
                <AdminClient.PenaltyActions penaltyId={p.id} status={p.status} />
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
