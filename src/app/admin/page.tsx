import { prisma } from "@/lib/db";
import { AdminClient } from "./AdminClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [teams, penalties, purchases, raceStatus, wheelConfig] = await Promise.all([
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
  ]);

  const voteCounts = await prisma.vote.groupBy({
    by: ["teamId"],
    _count: true,
  });

  return (
    <div className="container space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Halduspaneel</h1>

      <AdminClient
        initialRaceStatus={raceStatus?.status ?? "pre-race"}
        initialWheelConfig={wheelConfig?.outcomesJson ?? "[]"}
      />

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
