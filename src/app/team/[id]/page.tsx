import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureDefaultTeams } from "@/lib/default-teams";
import { getTeamPenaltyQueue } from "@/lib/penalty-queue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TeamPageMap } from "@/components/map/TeamPageMap";
import { PenaltyShop } from "@/components/shop/PenaltyShop";

const TRAIL_POINTS_LIMIT = 500;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (!Number.isInteger(teamId) || teamId <= 0) notFound();
  await ensureDefaultTeams();

  const [team, allTeams, penaltyQueue, trailPoints] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      include: {
        penalties: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            penaltyOption: { select: { title: true, durationMinutes: true } },
          },
        },
      },
    }),
    prisma.team.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
    getTeamPenaltyQueue(teamId),
    prisma.teamLocationPoint.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      take: TRAIL_POINTS_LIMIT,
      select: { lat: true, lng: true },
    }),
  ]);

  if (!team) notFound();

  const activePenalty =
    penaltyQueue.current?.type === "TIMEOUT" ? penaltyQueue.current : null;
  const trailCoords =
    trailPoints.length >= 2
      ? trailPoints
          .reverse()
          .map((p) => [p.lng, p.lat] as [number, number])
      : null;

  const locationText =
    team.lastLat != null && team.lastLng != null
      ? `Ligikaudu ${team.lastLat.toFixed(3)}, ${team.lastLng.toFixed(3)}`
      : "Veel jagamata";
  const updatedAgo =
    team.lastUpdatedAt
      ? `${Math.round((Date.now() - team.lastUpdatedAt.getTime()) / 1000)} s tagasi`
      : null;
  const distanceKm = team.totalDistanceKm ?? 0;

  return (
    <div className="container max-w-5xl space-y-8 px-4 py-8">
      <div>
        <Link href="/">
          <Button variant="ghost" size="sm">← Tagasi</Button>
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div
              className="mb-2 h-3 w-24 rounded-full"
              style={{ backgroundColor: team.color }}
            />
            <CardTitle>{team.name}</CardTitle>
            <CardDescription>Praegune ligikaudne asukoht</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TeamPageMap
              teamId={team.id}
              name={team.name}
              color={team.color}
              lastLat={team.lastLat}
              lastLng={team.lastLng}
              initialActivePenalty={activePenalty}
              initialTrail={trailCoords ? { color: team.color, coordinates: trailCoords } : null}
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
            />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <p className="font-mono text-muted-foreground">{locationText}</p>
              {updatedAgo && (
                <p className="text-muted-foreground">Uuendatud {updatedAgo}</p>
              )}
              <p className="font-medium">
                Läbitud: <span className="text-primary">{distanceKm.toFixed(1)} km</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col">
          <PenaltyShop
            teams={allTeams}
            fixedTeamId={team.id}
            fixedTeamName={team.name}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selle meeskonna karistused</CardTitle>
          <CardDescription>Ostetud sekkumised (ootel või aktiivsed)</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {team.penalties.length === 0 ? (
              <li className="text-muted-foreground">Karistusi veel pole.</li>
            ) : (
              team.penalties.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between rounded border p-3 text-sm"
                >
                  <span>
                    <strong>{p.penaltyOption.title}</strong>
                    {p.penaltyOption.durationMinutes != null && (
                      <span className="text-muted-foreground">
                        {" "}({p.penaltyOption.durationMinutes} min)
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      p.status === "ACTIVE"
                        ? "text-amber-500"
                        : p.status === "COMPLETED"
                        ? "text-muted-foreground"
                        : ""
                    }
                  >
                    {p.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
